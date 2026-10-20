import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import type { CapturedEndpoint } from '../types';
import { JsonViewer } from './JsonViewer';
import { generateCurlCommand } from '../utils/exportUtils';

interface EndpointDetailModalProps {
  endpoint: CapturedEndpoint | null;
  onClose: () => void;
}

type TabType = 'response' | 'reqHeaders' | 'resHeaders' | 'reqBody' | 'curl';

export const EndpointDetailModal: React.FC<EndpointDetailModalProps> = ({ endpoint, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('response');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!endpoint) return null;

  const curlCommand = generateCurlCommand(endpoint);

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

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(endpoint.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs">
      <div className="dev-card w-full max-w-4xl rounded-lg overflow-hidden flex flex-col max-h-[88vh] shadow-xl border border-dev-border">
        {/* Header */}
        <div className="bg-dev-surface p-4 border-b border-dev-border flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-bold ${getMethodBadgeClass(endpoint.method)}`}>
                {endpoint.method}
              </span>
              <span className={`font-semibold ${getStatusClass(endpoint.status)}`}>
                {endpoint.status} {endpoint.statusText}
              </span>
              <span className="text-dev-muted">•</span>
              <span className={endpoint.authClassification.isPublic ? 'text-emerald-400' : 'text-amber-400'}>
                {endpoint.authClassification.isPublic ? 'Public' : `Protected (${endpoint.authClassification.authType})`}
              </span>
              <span className="text-dev-muted">•</span>
              <span className="text-dev-muted">{endpoint.responseTimeMs}ms</span>
            </div>

            <div className="flex items-center gap-2 bg-dev-bg px-2.5 py-1.5 rounded border border-dev-border">
              <span className="truncate flex-1 select-all text-dev-bright">{endpoint.url}</span>
              <button
                onClick={handleCopyUrl}
                className="p-1 hover:text-dev-bright text-dev-muted transition-colors shrink-0"
                title="Copy URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="text-[11px] text-dev-muted truncate">
              Triggered on: <span className="text-dev-text">{endpoint.pageUrl}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-dev-muted hover:text-dev-bright hover:bg-dev-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auth details strip */}
        <div className="bg-dev-bg px-4 py-1.5 border-b border-dev-border flex flex-wrap items-center gap-2 text-[11px] font-mono text-dev-muted">
          <span>Auth Note:</span>
          {endpoint.authClassification.details.map((detail, idx) => (
            <span key={idx} className="text-dev-text bg-dev-subtle px-1.5 py-0.5 rounded border border-dev-border">
              {detail}
            </span>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="bg-dev-surface px-4 pt-1.5 border-b border-dev-border flex gap-1 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('response')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'response'
                ? 'border-blue-500 text-dev-bright'
                : 'border-transparent text-dev-muted hover:text-dev-text'
            }`}
          >
            Response Body
          </button>

          <button
            onClick={() => setActiveTab('reqHeaders')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'reqHeaders'
                ? 'border-blue-500 text-dev-bright'
                : 'border-transparent text-dev-muted hover:text-dev-text'
            }`}
          >
            Request Headers ({Object.keys(endpoint.requestHeaders || {}).length})
          </button>

          <button
            onClick={() => setActiveTab('resHeaders')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === 'resHeaders'
                ? 'border-blue-500 text-dev-bright'
                : 'border-transparent text-dev-muted hover:text-dev-text'
            }`}
          >
            Response Headers ({Object.keys(endpoint.responseHeaders || {}).length})
          </button>

          {endpoint.requestBody && (
            <button
              onClick={() => setActiveTab('reqBody')}
              className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                activeTab === 'reqBody'
                  ? 'border-blue-500 text-dev-bright'
                  : 'border-transparent text-dev-muted hover:text-dev-text'
              }`}
            >
              Request Body
            </button>
          )}

          <button
            onClick={() => setActiveTab('curl')}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ml-auto ${
              activeTab === 'curl'
                ? 'border-blue-500 text-dev-bright'
                : 'border-transparent text-dev-muted hover:text-dev-text'
            }`}
          >
            cURL
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-dev-bg">
          {activeTab === 'response' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-dev-muted">
                <span>Content-Type: <code className="text-dev-text">{endpoint.contentType || 'n/a'}</code></span>
                <span>Size: <code className="text-dev-text">{(endpoint.responseSize / 1024).toFixed(2)} KB</code></span>
              </div>
              <JsonViewer data={endpoint.responseBody} maxHeight="max-h-[460px]" />
            </div>
          )}

          {activeTab === 'reqHeaders' && (
            <div className="rounded border border-dev-border overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-dev-subtle text-dev-muted border-b border-dev-border text-[11px]">
                  <tr>
                    <th className="px-3 py-2 w-1/3">Header</th>
                    <th className="px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dev-border bg-dev-bg text-dev-text">
                  {Object.entries(endpoint.requestHeaders || {}).map(([key, val]) => (
                    <tr key={key} className="hover:bg-dev-subtle/50">
                      <td className="px-3 py-1.5 text-blue-400 select-all">{key}</td>
                      <td className="px-3 py-1.5 break-all select-all">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'resHeaders' && (
            <div className="rounded border border-dev-border overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-dev-subtle text-dev-muted border-b border-dev-border text-[11px]">
                  <tr>
                    <th className="px-3 py-2 w-1/3">Header</th>
                    <th className="px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dev-border bg-dev-bg text-dev-text">
                  {Object.entries(endpoint.responseHeaders || {}).map(([key, val]) => (
                    <tr key={key} className="hover:bg-dev-subtle/50">
                      <td className="px-3 py-1.5 text-blue-400 select-all">{key}</td>
                      <td className="px-3 py-1.5 break-all select-all">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reqBody' && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-dev-muted">Request Body:</div>
              <JsonViewer data={endpoint.requestBody} maxHeight="max-h-[460px]" />
            </div>
          )}

          {activeTab === 'curl' && (
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-dev-muted text-[11px]">Executable cURL Command:</span>
                <button
                  onClick={handleCopyCurl}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-dev-border bg-dev-subtle hover:text-dev-bright transition-colors"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy cURL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded border border-dev-border bg-dev-subtle text-dev-bright overflow-x-auto whitespace-pre-wrap select-all leading-relaxed">
                {curlCommand}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
