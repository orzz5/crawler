import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { CrawlConfigForm } from './components/CrawlConfigForm';
import { LiveProgress } from './components/LiveProgress';
import { StatsOverview } from './components/StatsOverview';
import { LiveLogViewer } from './components/LiveLogViewer';
import { EndpointsView } from './components/EndpointsView';
import { EndpointDetailModal } from './components/EndpointDetailModal';
import type { CrawlConfig, CrawlSession, CapturedEndpoint, LogMessage } from './types';
import { AlertCircle, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const App: React.FC = () => {
  const [session, setSession] = useState<CrawlSession | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<CapturedEndpoint | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const isCrawling = session?.status === 'running';

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleStartCrawl = async (config: CrawlConfig) => {
    setApiError(null);
    setLogs([]);

    // Close any prior stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const response = await fetch(`${API_BASE}/api/crawl/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with HTTP ${response.status}`);
      }

      const { sessionId, session: initialSession } = await response.json();
      setSession(initialSession);

      // Connect to Server-Sent Events (SSE)
      const sse = new EventSource(`${API_BASE}/api/crawl/events/${sessionId}`);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          switch (payload.type) {
            case 'INIT':
              setSession(payload.session);
              break;

            case 'LOG':
              setLogs((prev) => [...prev, payload.log]);
              break;

            case 'PAGE_START':
              setSession((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  currentUrl: payload.url
                };
              });
              break;

            case 'PAGE_COMPLETE':
              setSession((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  stats: payload.stats,
                  pages: {
                    ...prev.pages,
                    [payload.page.url]: payload.page
                  }
                };
              });
              break;

            case 'ENDPOINT_FOUND':
              setSession((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  stats: payload.stats,
                  endpoints: [payload.endpoint, ...prev.endpoints]
                };
              });
              break;

            case 'SESSION_COMPLETE':
            case 'SESSION_STOPPED':
              setSession(payload.session);
              sse.close();
              break;

            case 'SESSION_ERROR':
              setSession(payload.session);
              setApiError(payload.error || 'Crawler encountered an error');
              sse.close();
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      sse.onerror = (err) => {
        console.warn('SSE connection closed:', err);
        setSession((prev) => {
          if (prev && prev.status === 'running') {
            return {
              ...prev,
              status: 'stopped',
              stats: {
                ...prev.stats,
                endTime: new Date().toISOString()
              }
            };
          }
          return prev;
        });
        sse.close();
      };
    } catch (err: any) {
      setApiError(err.message || 'Failed to start crawl');
    }
  };

  const handleStopCrawl = async () => {
    if (!session || !isCrawling) return;
    try {
      const res = await fetch(`${API_BASE}/api/crawl/stop/${session.id}`, { method: 'POST' });
      if (!res.ok) {
        setSession((prev) => (prev ? { ...prev, status: 'stopped' } : null));
      }
    } catch (err) {
      console.warn('Failed to stop crawl:', err);
      setSession((prev) => (prev ? { ...prev, status: 'stopped' } : null));
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header isCrawling={isCrawling} targetUrl={session?.config.startUrl} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        {apiError && (
          <div className="p-3 rounded dev-card border-red-800 text-red-400 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="text-dev-muted hover:text-dev-bright underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Target URL Input Form */}
        <CrawlConfigForm
          onStart={handleStartCrawl}
          onStop={handleStopCrawl}
          isCrawling={isCrawling}
        />

        {session && (
          <div className="space-y-4">
            <LiveProgress session={session} onStop={handleStopCrawl} />

            <StatsOverview stats={session.stats} />

            {/* Collapsible Log Stream Drawer */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-dev-muted">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-1.5 hover:text-dev-bright transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{showLogs ? 'Hide Console Output' : 'Show Console Output'}</span>
                  {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <span className="text-[11px] text-dev-muted">
                  {logs.length} events
                </span>
              </div>

              {showLogs && (
                <LiveLogViewer logs={logs} onClear={() => setLogs([])} />
              )}
            </div>

            {/* Discovered Endpoints (Deduplicated vs Subpage) */}
            <EndpointsView
              session={session}
              onSelectEndpoint={(ep) => setSelectedEndpoint(ep)}
            />
          </div>
        )}
      </main>

      <EndpointDetailModal
        endpoint={selectedEndpoint}
        onClose={() => setSelectedEndpoint(null)}
      />

      <footer className="border-t border-dev-border py-4 text-center text-[11px] font-mono text-dev-muted mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>Endpoint Inspector — Public API & Network Interception</span>
          <span>Node.js • Express • Playwright • React • TypeScript</span>
        </div>
      </footer>
    </div>
  );
};
