import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import type {
  CrawlConfig,
  CrawlSession,
  CapturedEndpoint,
  PageCrawlResult,
  SseEvent,
  LogLevel
} from '../types/index.js';
import { normalizeUrl, isSameOriginOrDomain, isStaticAssetUrl } from './urlUtils.js';
import { isApiCandidate, extractCapturedEndpoint } from './detector.js';

interface QueueItem {
  url: string;
  depth: number;
}

export class CrawlerEngine {
  private sessions: Map<string, CrawlSession> = new Map();
  private eventListeners: Map<string, Set<(event: SseEvent) => void>> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private activeBrowsers: Map<string, Browser> = new Map();

  public getSession(sessionId: string): CrawlSession | undefined {
    return this.sessions.get(sessionId);
  }

  public subscribe(sessionId: string, listener: (event: SseEvent) => void): () => void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }
    const listeners = this.eventListeners.get(sessionId)!;
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(sessionId);
      }
    };
  }

  private emit(sessionId: string, event: SseEvent) {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`Error notifying listener for session ${sessionId}:`, err);
        }
      });
    }
  }

  private log(sessionId: string, level: LogLevel, message: string, metadata?: Record<string, any>) {
    const logItem = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };
    this.emit(sessionId, { type: 'LOG', log: logItem });
  }

  public async startCrawl(config: CrawlConfig): Promise<CrawlSession> {
    const normalizedStart = normalizeUrl(config.startUrl);
    if (!normalizedStart) {
      throw new Error(`Invalid starting URL: ${config.startUrl}`);
    }

    const sessionId = uuidv4();
    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);

    const session: CrawlSession = {
      id: sessionId,
      status: 'running',
      config: {
        startUrl: normalizedStart,
        maxDepth: config.maxDepth ?? 2,
        maxPages: config.maxPages ?? 20,
        pageTimeoutMs: config.pageTimeoutMs ?? 15000,
        waitAfterLoadMs: config.waitAfterLoadMs ?? 1500,
        includeThirdPartyApis: config.includeThirdPartyApis ?? true,
        customIgnorePatterns: config.customIgnorePatterns ?? []
      },
      stats: {
        pagesScanned: 0,
        pagesQueued: 1,
        pagesFailed: 0,
        totalApisFound: 0,
        publicApisFound: 0,
        protectedApisFound: 0,
        durationMs: 0,
        startTime: new Date().toISOString()
      },
      pages: {},
      endpoints: [],
      currentUrl: null
    };

    this.sessions.set(sessionId, session);

    // Launch crawl asynchronously in the background so API responds immediately with session
    this.runCrawlTask(sessionId, abortController.signal).catch((err) => {
      console.error(`Crawl task failure for session ${sessionId}:`, err);
    });

    return session;
  }

  public async stopCrawl(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'running') {
      return false;
    }

    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }

    const browser = this.activeBrowsers.get(sessionId);
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
      this.activeBrowsers.delete(sessionId);
    }

    session.status = 'stopped';
    session.stats.endTime = new Date().toISOString();
    session.stats.durationMs = Date.now() - new Date(session.stats.startTime).getTime();
    this.emit(sessionId, { type: 'SESSION_STOPPED', session });
    this.log(sessionId, 'warn', 'Crawl process manually stopped by user.');

    return true;
  }

  private async runCrawlTask(sessionId: string, signal: AbortSignal) {
    const session = this.sessions.get(sessionId)!;
    const config = session.config;
    const startTime = Date.now();

    this.emit(sessionId, { type: 'INIT', session });
    this.log(sessionId, 'info', `Initialized crawler session targeting: ${config.startUrl}`);
    this.log(
      sessionId,
      'info',
      `Configuration: maxDepth=${config.maxDepth}, maxPages=${config.maxPages}, timeout=${config.pageTimeoutMs}ms`
    );

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      this.log(sessionId, 'info', 'Launching headless Chromium instance...');
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });

      this.activeBrowsers.set(sessionId, browser);

      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 API-Discovery-Crawler/1.0',
        viewport: { width: 1366, height: 768 },
        ignoreHTTPSErrors: true
      });

      const queue: QueueItem[] = [{ url: config.startUrl, depth: 0 }];
      const visited = new Set<string>();
      const queued = new Set<string>([config.startUrl]);
      const seenEndpoints = new Set<string>();

      while (queue.length > 0 && !signal.aborted) {
        if (session.stats.pagesScanned >= config.maxPages!) {
          this.log(sessionId, 'info', `Reached maximum page limit (${config.maxPages}). Halting crawl queue.`);
          break;
        }

        const current = queue.shift()!;
        const currentUrl = current.url;
        visited.add(currentUrl);
        session.currentUrl = currentUrl;

        this.emit(sessionId, { type: 'PAGE_START', url: currentUrl, depth: current.depth });
        this.log(sessionId, 'info', `Scanning [Depth ${current.depth}]: ${currentUrl}`);

        const pageResult: PageCrawlResult = {
          url: currentUrl,
          depth: current.depth,
          status: 'scanning',
          discoveredInternalLinks: [],
          endpointsCount: 0
        };
        session.pages[currentUrl] = pageResult;

        let page: Page | null = null;
        try {
          page = await context.newPage();

          // Intercept network responses on this page
          const pendingCaptures: Promise<void>[] = [];

          page.on('response', (response) => {
            const request = response.request();
            if (isApiCandidate(request, response)) {
              const reqStartTime = Date.now();
              const capturePromise = (async () => {
                const endpoint = await extractCapturedEndpoint(currentUrl, request, response, reqStartTime);
                if (endpoint) {
                  // Key to deduplicate redundant identical requests on the same subpage
                  const dedupeKey = `${endpoint.method}:${endpoint.url}:${currentUrl}`;
                  if (!seenEndpoints.has(dedupeKey)) {
                    seenEndpoints.add(dedupeKey);
                    session.endpoints.push(endpoint);
                    pageResult.endpointsCount++;
                    session.stats.totalApisFound++;

                    if (endpoint.authClassification.isPublic) {
                      session.stats.publicApisFound++;
                    } else {
                      session.stats.protectedApisFound++;
                    }

                    this.emit(sessionId, {
                      type: 'ENDPOINT_FOUND',
                      endpoint,
                      stats: session.stats
                    });

                    this.log(
                      sessionId,
                      'api',
                      `Intercepted [${endpoint.method}] ${endpoint.url} (${endpoint.status} ${endpoint.statusText || 'OK'})`,
                      {
                        method: endpoint.method,
                        status: endpoint.status,
                        isPublic: endpoint.authClassification.isPublic,
                        authType: endpoint.authClassification.authType
                      }
                    );
                  }
                }
              })();
              pendingCaptures.push(capturePromise);
            }
          });

          // Navigate to current subpage
          const navResponse = await page.goto(currentUrl, {
            timeout: config.pageTimeoutMs,
            waitUntil: 'domcontentloaded'
          });

          if (navResponse) {
            pageResult.statusCode = navResponse.status();
          }

          try {
            pageResult.title = await page.title();
          } catch {
            // ignore
          }

          // Wait a short time for client-side JavaScript / SPAs to fire data hydration calls
          if (config.waitAfterLoadMs && config.waitAfterLoadMs > 0) {
            await page.waitForTimeout(config.waitAfterLoadMs);
          }

          // Await any pending response body reads
          await Promise.allSettled(pendingCaptures);

          // Discover internal links on page if not at maxDepth
          if (current.depth < config.maxDepth!) {
            try {
              const rawHrefs = await page.$$eval('a[href]', (anchors) =>
                anchors.map((a) => (a as HTMLAnchorElement).href)
              );

              for (const rawHref of rawHrefs) {
                const normalized = normalizeUrl(rawHref, currentUrl);
                if (!normalized) continue;

                // Restrict strictly to same origin/domain
                if (!isSameOriginOrDomain(normalized, config.startUrl)) continue;

                // Skip static assets
                if (isStaticAssetUrl(normalized)) continue;

                if (!pageResult.discoveredInternalLinks.includes(normalized)) {
                  pageResult.discoveredInternalLinks.push(normalized);
                }

                if (!visited.has(normalized) && !queued.has(normalized)) {
                  queued.add(normalized);
                  queue.push({ url: normalized, depth: current.depth + 1 });
                  session.stats.pagesQueued = queued.size;
                }
              }
            } catch (err: any) {
              this.log(sessionId, 'warn', `Could not extract links from ${currentUrl}: ${err.message}`);
            }
          }

          pageResult.status = 'completed';
          session.stats.pagesScanned++;
        } catch (pageErr: any) {
          pageResult.status = 'failed';
          pageResult.error = pageErr.message || 'Page navigation failed or timed out';
          session.stats.pagesFailed++;
          this.log(sessionId, 'error', `Failed visiting ${currentUrl}: ${pageResult.error}`);
        } finally {
          if (page) {
            try {
              await page.close();
            } catch {
              // ignore
            }
          }
        }

        session.stats.durationMs = Date.now() - startTime;
        this.emit(sessionId, {
          type: 'PAGE_COMPLETE',
          page: pageResult,
          stats: session.stats
        });
      }

      if (!signal.aborted) {
        session.status = 'completed';
        session.currentUrl = null;
        session.stats.endTime = new Date().toISOString();
        session.stats.durationMs = Date.now() - startTime;

        this.log(
          sessionId,
          'success',
          `Crawl complete! Scanned ${session.stats.pagesScanned} pages, discovered ${session.stats.totalApisFound} API endpoints (${session.stats.publicApisFound} public, ${session.stats.protectedApisFound} protected).`
        );
        this.emit(sessionId, { type: 'SESSION_COMPLETE', session });
      }
    } catch (crawlErr: any) {
      if (!signal.aborted) {
        session.status = 'failed';
        session.stats.endTime = new Date().toISOString();
        session.stats.durationMs = Date.now() - startTime;
        const errMsg = crawlErr.message || 'Crawler encountered fatal error';
        this.log(sessionId, 'error', `Fatal crawler failure: ${errMsg}`);
        this.emit(sessionId, { type: 'SESSION_ERROR', error: errMsg, session });
      }
    } finally {
      if (context) {
        try {
          await context.close();
        } catch {
          // ignore
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore
        }
      }
      this.activeBrowsers.delete(sessionId);
      this.abortControllers.delete(sessionId);
    }
  }

  public cleanup() {
    for (const [sessionId, browser] of this.activeBrowsers.entries()) {
      try {
        browser.close();
      } catch {
        // ignore
      }
    }
    this.activeBrowsers.clear();
  }
}

export const crawlerEngine = new CrawlerEngine();
