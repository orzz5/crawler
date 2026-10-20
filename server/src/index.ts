import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { crawlerEngine } from './crawler/engine.js';
import type { CrawlConfig } from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Start a crawl session
app.post('/api/crawl/start', async (req: Request, res: Response) => {
  try {
    const config: CrawlConfig = req.body;
    if (!config || !config.startUrl) {
      res.status(400).json({ error: 'Missing startUrl in request body' });
      return;
    }

    const session = await crawlerEngine.startCrawl(config);
    res.status(201).json({ success: true, sessionId: session.id, session });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initialize crawl session' });
  }
});

// Stop a running crawl session
app.post('/api/crawl/stop/:sessionId', async (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);
  const stopped = await crawlerEngine.stopCrawl(sessionId);
  if (!stopped) {
    res.status(404).json({ error: 'Session not found or not currently active' });
    return;
  }
  const session = crawlerEngine.getSession(sessionId);
  res.json({ success: true, session });
});

// Get session details
app.get('/api/crawl/session/:sessionId', (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);
  const session = crawlerEngine.getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ success: true, session });
});

// Real-time Server-Sent Events (SSE) stream for a session
app.get('/api/crawl/events/:sessionId', (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);
  const session = crawlerEngine.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Flush initial connection message
  res.write(`data: ${JSON.stringify({ type: 'INIT', session })}\n\n`);

  // Subscribe to crawler engine events
  const unsubscribe = crawlerEngine.subscribe(sessionId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Periodic heartbeat ping to prevent connection timeout through proxies
  const heartbeatTimer = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    unsubscribe();
  });
});

// Export discovered endpoints as JSON or CSV
app.get('/api/crawl/export/:sessionId', (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);
  const format = (req.query.format as string) || 'json';
  const session = crawlerEngine.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const filename = `api-discovery-${new URL(session.config.startUrl).hostname}-${sessionId.slice(0, 8)}`;

  if (format === 'csv') {
    const headers = [
      'ID',
      'Method',
      'Status',
      'URL',
      'Origin',
      'Subpage Discovered',
      'Is Public',
      'Auth Type',
      'Content Type',
      'Response Time (ms)',
      'Response Size (bytes)',
      'Timestamp'
    ];

    const escapeCsv = (str: any) => `"${String(str ?? '').replace(/"/g, '""')}"`;

    const rows = session.endpoints.map((ep) => [
      ep.id,
      ep.method,
      ep.status,
      ep.url,
      ep.origin,
      ep.pageUrl,
      ep.authClassification.isPublic ? 'YES' : 'NO',
      ep.authClassification.authType,
      ep.contentType,
      ep.responseTimeMs,
      ep.responseSize,
      ep.timestamp
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csvContent);
  } else {
    // Default JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.json({
      metadata: {
        exportedAt: new Date().toISOString(),
        startUrl: session.config.startUrl,
        totalPagesScanned: session.stats.pagesScanned,
        totalApisFound: session.stats.totalApisFound,
        publicApisFound: session.stats.publicApisFound,
        protectedApisFound: session.stats.protectedApisFound,
        durationMs: session.stats.durationMs
      },
      endpoints: session.endpoints,
      pages: session.pages
    });
  }
});

// Process cleanup handlers
const shutdown = () => {
  console.log('\nShutting down server and releasing Playwright browser resources...');
  crawlerEngine.cleanup();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 API Grabber Crawler Server running at http://0.0.0.0:${PORT}`);
  console.log(`======================================================\n`);
});
