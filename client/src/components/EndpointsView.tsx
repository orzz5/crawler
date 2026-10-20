import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, Code, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import type { CrawlSession, CapturedEndpoint } from '../types';
import { SubpageAccordion } from './SubpageAccordion';
import { ExportDropdown } from './ExportDropdown';
import { JsonViewer } from './JsonViewer';

interface EndpointsViewProps {
  session: CrawlSession | null;
  onSelectEndpoint: (endpoint: CapturedEndpoint) => void;
}

interface DeduplicatedEndpoint {
  key: string;
  representative: CapturedEndpoint;
  count: number;
  subpages: string[];
  statuses: number[];
}

export const EndpointsView: React.FC<EndpointsViewProps> = ({ session, onSelectEndpoint }) => {
  const [viewMode, setViewMode] = useState<'deduplicated' | 'subpage'>('deduplicated');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [authFilter, setAuthFilter] = useState<'ALL' | 'PUBLIC' | 'PROTECTED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '2XX' | 'ERRORS'>('ALL');
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedSubpagesKey, setExpandedSubpagesKey] = useState<string | null>(null);

  const endpoints = session?.endpoints || [];
  const pages = session?.pages || {};

  // Deduplicate endpoints by Method + URL
  const deduplicatedList = useMemo(() => {
    const map = new Map<string, DeduplicatedEndpoint>();

    for (const ep of endpoints) {
      const key = `${ep.method.toUpperCase()} ${ep.url}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          representative: ep,
          count: 1,
          subpages: [ep.pageUrl],
          statuses: [ep.status]
        });
      } else {
        const item = map.get(key)!;
        item.count += 1;
        if (!item.subpages.includes(ep.pageUrl)) {
          item.subpages.push(ep.pageUrl);
        }
        if (!item.statuses.includes(ep.status)) {
          item.statuses.push(ep.status);
        }
      }
    }

    return Array.from(map.values());
  }, [endpoints]);

  // Filtered raw endpoints (for subpage view)
  const filteredRawEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!ep.url.toLowerCase().includes(q) && !ep.method.toLowerCase().includes(q) && !ep.pageUrl.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (methodFilter !== 'ALL' && ep.method.toUpperCase() !== methodFilter) return false;
      if (authFilter === 'PUBLIC' && !ep.authClassification.isPublic) return false;
      if (authFilter === 'PROTECTED' && ep.authClassification.isPublic) return false;
      if (statusFilter === '2XX' && (ep.status < 200 || ep.status >= 300)) return false;
      if (statusFilter === 'ERRORS' && ep.status < 400) return false;
      return true;
    });
  }, [endpoints, searchTerm, methodFilter, authFilter, statusFilter]);

  // Filtered deduplicated list
  const filteredDeduplicated = useMemo(() => {
    return deduplicatedList.filter((item) => {
      const ep = item.representative;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesUrl = ep.url.toLowerCase().includes(q);
        const matchesMethod = ep.method.toLowerCase().includes(q);
        const matchesPages = item.subpages.some((p) => p.toLowerCase().includes(q));
        if (!matchesUrl && !matchesMethod && !matchesPages) {
          return false;
        }
      }
      if (methodFilter !== 'ALL' && ep.method.toUpperCase() !== methodFilter) return false;
      if (authFilter === 'PUBLIC' && !ep.authClassification.isPublic) return false;
      if (authFilter === 'PROTECTED' && ep.authClassification.isPublic) return false;
      if (statusFilter === '2XX' && !item.statuses.some((s) => s >= 200 && s < 300)) return false;
      if (statusFilter === 'ERRORS' && !item.statuses.some((s) => s >= 400)) return false;
      return true;
    });
  }, [deduplicatedList, searchTerm, methodFilter, authFilter, statusFilter]);

  const handleCopyUrl = (key: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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

  return (
    <div className="space-y-3 font-mono">
      {/* Control Bar: Mode Toggle + Search + Filters + Export */}
      <div className="dev-card p-3 rounded-lg space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* View Mode Toggle: Deduplicate Unique vs View by Subpage */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded bg-dev-bg p-0.5 border border-dev-border text-xs">
              <button
                onClick={() => setViewMode('deduplicated')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  viewMode === 'deduplicated'
                    ? 'bg-dev-subtle text-dev-bright border border-dev-muted'
                    : 'text-dev-muted hover:text-dev-text'
                }`}
              >
                Deduplicate unique endpoints ({deduplicatedList.length})
              </button>
              <button
                onClick={() => setViewMode('subpage')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  viewMode === 'subpage'
                    ? 'bg-dev-subtle text-dev-bright border border-dev-muted'
                    : 'text-dev-muted hover:text-dev-text'
                }`}
              >
                View by subpage ({Object.keys(pages).length})
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <ExportDropdown session={session} />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dev-border text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-dev-muted absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded dev-input text-xs"
            />
          </div>

          {/* Auth Filter */}
          <div className="inline-flex rounded bg-dev-bg p-0.5 border border-dev-border text-[11px]">
            <button
              onClick={() => setAuthFilter('ALL')}
              className={`px-2 py-0.5 rounded ${authFilter === 'ALL' ? 'bg-dev-subtle text-dev-bright' : 'text-dev-muted hover:text-dev-text'}`}
            >
              All
            </button>
            <button
              onClick={() => setAuthFilter('PUBLIC')}
              className={`px-2 py-0.5 rounded ${authFilter === 'PUBLIC' ? 'bg-dev-subtle text-emerald-400 font-semibold' : 'text-dev-muted hover:text-dev-text'}`}
            >
              Public
            </button>
            <button
              onClick={() => setAuthFilter('PROTECTED')}
              className={`px-2 py-0.5 rounded ${authFilter === 'PROTECTED' ? 'bg-dev-subtle text-amber-400 font-semibold' : 'text-dev-muted hover:text-dev-text'}`}
            >
              Protected
            </button>
          </div>

          {/* Method Filter */}
          <div className="flex items-center gap-1 bg-dev-bg px-2 py-1 rounded border border-dev-border text-[11px]">
            <span className="text-dev-muted">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-transparent text-dev-text focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-dev-surface">All</option>
              <option value="GET" className="bg-dev-surface">GET</option>
              <option value="POST" className="bg-dev-surface">POST</option>
              <option value="PUT" className="bg-dev-surface">PUT</option>
              <option value="DELETE" className="bg-dev-surface">DELETE</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-dev-bg px-2 py-1 rounded border border-dev-border text-[11px]">
            <span className="text-dev-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-dev-text focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-dev-surface">All</option>
              <option value="2XX" className="bg-dev-surface">2xx OK</option>
              <option value="ERRORS" className="bg-dev-surface">Errors (4xx/5xx)</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'subpage' ? (
        <SubpageAccordion
          pages={pages}
          endpoints={filteredRawEndpoints}
          onSelectEndpoint={onSelectEndpoint}
        />
      ) : (
        /* Deduplicated Unique Endpoints View */
        <div className="space-y-1.5">
          {filteredDeduplicated.length === 0 ? (
            <div className="dev-card p-8 text-center rounded-lg text-xs text-dev-muted">
              No matching endpoints found.
            </div>
          ) : (
            filteredDeduplicated.map((item) => {
              const ep = item.representative;
              const isPreviewOpen = previewKey === item.key;
              const isCopied = copiedKey === item.key;
              const isSubpagesOpen = expandedSubpagesKey === item.key;

              return (
                <div
                  key={item.key}
                  className="dev-card p-3 rounded-lg hover:border-dev-muted/60 transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getMethodBadgeClass(ep.method)}`}>
                        {ep.method}
                      </span>

                      <span className={`font-semibold text-[11px] ${getStatusClass(ep.status)}`}>
                        {ep.status}
                      </span>

                      <span className="text-dev-bright truncate" title={ep.url}>
                        {ep.url}
                      </span>

                      <button
                        onClick={(e) => handleCopyUrl(item.key, ep.url, e)}
                        className="text-dev-muted hover:text-dev-bright transition-colors shrink-0"
                        title="Copy endpoint URL"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-[11px]">
                      {/* Occurrences Pill */}
                      <button
                        onClick={() => setExpandedSubpagesKey(isSubpagesOpen ? null : item.key)}
                        className="px-2 py-0.5 rounded bg-dev-subtle hover:bg-dev-border/70 border border-dev-border text-dev-muted hover:text-dev-text transition-colors flex items-center gap-1"
                        title="View subpages where this API was triggered"
                      >
                        <span>{item.count} {item.count === 1 ? 'call' : 'calls'}</span>
                        <span className="text-dev-muted">({item.subpages.length} {item.subpages.length === 1 ? 'page' : 'pages'})</span>
                        {isSubpagesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>

                      {/* Auth classification */}
                      <span className={ep.authClassification.isPublic ? 'text-emerald-400' : 'text-amber-400'}>
                        {ep.authClassification.isPublic ? 'Public' : ep.authClassification.authType}
                      </span>

                      <span className="text-dev-muted">{ep.responseTimeMs}ms</span>

                      <button
                        onClick={() => setPreviewKey(isPreviewOpen ? null : item.key)}
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
                        title="Inspect full request/response details"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Subpages expansion if user clicks calls badge */}
                  {isSubpagesOpen && (
                    <div className="p-2 rounded bg-dev-bg border border-dev-border text-[11px] text-dev-muted space-y-1">
                      <div className="font-semibold text-dev-text">Observed on subpages:</div>
                      {item.subpages.map((p, idx) => (
                        <div key={idx} className="truncate select-all text-dev-muted hover:text-dev-text">
                          • {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Payload Preview */}
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
};
