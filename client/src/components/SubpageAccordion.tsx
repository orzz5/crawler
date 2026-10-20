import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Code } from 'lucide-react';
import type { PageCrawlResult, CapturedEndpoint } from '../types';
import { JsonViewer } from './JsonViewer';

interface SubpageAccordionProps {
  pages: Record<string, PageCrawlResult>;
  endpoints: CapturedEndpoint[];
  onSelectEndpoint: (endpoint: CapturedEndpoint) => void;
}

export const SubpageAccordion: React.FC<SubpageAccordionProps> = ({
  pages,
  endpoints,
  onSelectEndpoint
}) => {
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [previewEndpointId, setPreviewEndpointId] = useState<string | null>(null);

  // Group endpoints by pageUrl
  const endpointsByPage: Record<string, CapturedEndpoint[]> = {};
  for (const ep of endpoints) {
    if (!endpointsByPage[ep.pageUrl]) {
      endpointsByPage[ep.pageUrl] = [];
    }
    endpointsByPage[ep.pageUrl].push(ep);
  }

  const allPageUrls = Array.from(
    new Set([...Object.keys(pages), ...Object.keys(endpointsByPage)])
  );

  const togglePage = (pageUrl: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageUrl]: !prev[pageUrl]
    }));
  };

  const toggleExpandAll = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    for (const url of allPageUrls) {
      updated[url] = expand;
    }
    setExpandedPages(updated);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'badge-get';
      case 'POST':
        return 'badge-post';
      case 'PUT':
      case 'PATCH':
        return 'badge-put';
      case 'DELETE':
        return 'badge-delete';
      default:
        return 'badge-default';
    }
  };

  const getStatusClass = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400';
    if (status >= 300 && status < 400) return 'text-blue-400';
    if (status >= 400 && status < 500) return 'text-amber-400';
    return 'text-red-400';
  };

  if (allPageUrls.length === 0) {
    return (
      <div className="dev-card p-8 text-center rounded-lg text-xs font-mono text-dev-muted">
        No endpoints discovered yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono text-dev-muted px-1">
        <span>Grouped by subpage ({allPageUrls.length} pages)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleExpandAll(true)}
            className="hover:text-dev-bright transition-colors"
          >
            Expand All
          </button>
          <span>•</span>
          <button
            onClick={() => toggleExpandAll(false)}
            className="hover:text-dev-bright transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {allPageUrls.map((pageUrl) => {
        const pageData = pages[pageUrl];
        const pageEndpoints = endpointsByPage[pageUrl] || [];
        const isExpanded = expandedPages[pageUrl] ?? true;

        return (
          <div
            key={pageUrl}
            className="dev-card rounded-lg overflow-hidden border border-dev-border"
          >
            {/* Subpage Header */}
            <div
              onClick={() => togglePage(pageUrl)}
              className="p-3 bg-dev-subtle cursor-pointer flex items-center justify-between gap-3 hover:bg-dev-border/50 transition-colors select-none text-xs font-mono"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-dev-muted">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
                <span className="text-dev-bright font-medium truncate">{pageUrl}</span>
                {pageData?.title && (
                  <span className="hidden sm:inline text-dev-muted truncate max-w-xs">
                    — {pageData.title}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                {pageData?.depth !== undefined && (
                  <span className="text-dev-muted px-1.5 py-0.5 rounded bg-dev-bg border border-dev-border">
                    d:{pageData.depth}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-dev-bg border border-dev-border text-dev-text">
                  {pageEndpoints.length} {pageEndpoints.length === 1 ? 'endpoint' : 'endpoints'}
                </span>
              </div>
            </div>

            {/* Endpoints under subpage */}
            {isExpanded && (
              <div className="divide-y divide-dev-border bg-dev-bg p-1">
                {pageEndpoints.length === 0 ? (
                  <div className="py-2.5 text-center text-xs font-mono text-dev-muted">
                    No data endpoints captured on this subpage.
                  </div>
                ) : (
                  pageEndpoints.map((ep) => {
                    const isPreviewOpen = previewEndpointId === ep.id;

                    return (
                      <div key={ep.id} className="p-2.5 hover:bg-dev-subtle/30 rounded transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getMethodBadgeClass(ep.method)}`}>
                              {ep.method}
                            </span>

                            <span className={`font-semibold text-[11px] ${getStatusClass(ep.status)}`}>
                              {ep.status}
                            </span>

                            <span className="text-dev-text truncate" title={ep.url}>
                              {ep.url}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-[11px]">
                            <span className={ep.authClassification.isPublic ? 'text-emerald-400' : 'text-amber-400'}>
                              {ep.authClassification.isPublic ? 'Public' : ep.authClassification.authType}
                            </span>

                            <span className="text-dev-muted">{ep.responseTimeMs}ms</span>

                            <button
                              onClick={() => setPreviewEndpointId(isPreviewOpen ? null : ep.id)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                                isPreviewOpen
                                  ? 'bg-dev-subtle border-dev-muted text-dev-bright'
                                  : 'border-dev-border text-dev-muted hover:text-dev-text'
                              }`}
                            >
                              <Code className="w-3 h-3" />
                              <span>{isPreviewOpen ? 'Hide' : 'Preview'}</span>
                            </button>

                            <button
                              onClick={() => onSelectEndpoint(ep)}
                              className="p-1 rounded border border-dev-border text-dev-muted hover:text-dev-bright transition-colors"
                              title="Inspect Details"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {isPreviewOpen && (
                          <div className="pt-1">
                            <JsonViewer data={ep.responseBody} maxHeight="max-h-60" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
