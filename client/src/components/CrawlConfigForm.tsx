import React, { useState } from 'react';
import { SlidersHorizontal, AlertCircle, ArrowRight, Square } from 'lucide-react';
import type { CrawlConfig } from '../types';

interface CrawlConfigFormProps {
  onStart: (config: CrawlConfig) => void;
  onStop: () => void;
  isCrawling: boolean;
}

const PRESETS = [
  { name: 'pokeapi.co', url: 'https://pokeapi.co' },
  { name: 'news.ycombinator.com', url: 'https://news.ycombinator.com' },
  { name: 'httpbin.org', url: 'https://httpbin.org' },
  { name: 'jsonplaceholder.typicode.com', url: 'https://jsonplaceholder.typicode.com' }
];

export const CrawlConfigForm: React.FC<CrawlConfigFormProps> = ({ onStart, onStop, isCrawling }) => {
  const [url, setUrl] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(20);
  const [pageTimeoutMs, setPageTimeoutMs] = useState(15000);
  const [waitAfterLoadMs, setWaitAfterLoadMs] = useState(1500);
  const [includeThirdPartyApis, setIncludeThirdPartyApis] = useState(true);
  const [ignorePatternsInput, setIgnorePatternsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    let testUrl = input.trim();
    if (!testUrl) {
      setError('Target URL is required');
      return false;
    }
    if (!/^https?:\/\//i.test(testUrl)) {
      testUrl = 'https://' + testUrl;
    }
    try {
      const parsed = new URL(testUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        setError('Valid domain name required (e.g. example.com)');
        return false;
      }
      setError(null);
      return true;
    } catch {
      setError('Invalid URL syntax');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(url)) return;

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const customIgnorePatterns = ignorePatternsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onStart({
      startUrl: finalUrl,
      maxDepth,
      maxPages,
      pageTimeoutMs,
      waitAfterLoadMs,
      includeThirdPartyApis,
      customIgnorePatterns
    });
  };

  return (
    <div className="dev-card rounded-lg p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Main URL Bar */}
        <div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="target-url"
                type="text"
                placeholder="Enter target URL (e.g., https://example.com)"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isCrawling}
                className={`w-full px-3.5 py-2 rounded dev-input font-mono text-sm placeholder:text-dev-muted transition-colors ${
                  error ? 'border-red-500' : ''
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                showOptions
                  ? 'bg-dev-subtle border-dev-muted text-dev-bright'
                  : 'bg-dev-surface border-dev-border text-dev-muted hover:text-dev-text'
              }`}
              title="Crawler Options"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Options</span>
            </button>

            {isCrawling ? (
              <button
                type="button"
                onClick={onStop}
                className="px-4 py-2 rounded text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800 flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 rounded text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-colors flex items-center gap-1.5"
              >
                <span>Scan Target</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
          <span className="text-dev-muted text-[11px] font-mono mr-1">Presets:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              disabled={isCrawling}
              onClick={() => {
                setUrl(preset.url);
                setError(null);
              }}
              className="px-2 py-0.5 rounded bg-dev-subtle hover:bg-dev-border/70 border border-dev-border text-dev-muted hover:text-dev-text text-[11px] font-mono transition-colors disabled:opacity-50"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Advanced Options Drawer */}
        {showOptions && (
          <div className="pt-3 border-t border-dev-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-dev-muted">
                <span>Crawl Depth</span>
                <span className="font-mono text-dev-text">{maxDepth} levels</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                disabled={isCrawling}
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-dev-muted">
                <span>Page Limit</span>
                <span className="font-mono text-dev-text">{maxPages} pages</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                disabled={isCrawling}
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-dev-muted">
                <span>Timeout</span>
                <span className="font-mono text-dev-text">{pageTimeoutMs / 1000}s</span>
              </div>
              <input
                type="range"
                min="5000"
                max="30000"
                step="2500"
                disabled={isCrawling}
                value={pageTimeoutMs}
                onChange={(e) => setPageTimeoutMs(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-dev-muted">
                <span>Hydration Delay</span>
                <span className="font-mono text-dev-text">{waitAfterLoadMs}ms</span>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="250"
                disabled={isCrawling}
                value={waitAfterLoadMs}
                onChange={(e) => setWaitAfterLoadMs(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
              <span className="text-dev-muted">Custom Ignore Patterns (comma-separated regex / substrings)</span>
              <input
                type="text"
                placeholder="e.g. /logout, /auth, /admin"
                disabled={isCrawling}
                value={ignorePatternsInput}
                onChange={(e) => setIgnorePatternsInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded dev-input font-mono text-xs placeholder:text-dev-muted"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-4">
              <input
                type="checkbox"
                id="thirdPartyToggle"
                disabled={isCrawling}
                checked={includeThirdPartyApis}
                onChange={(e) => setIncludeThirdPartyApis(e.target.checked)}
                className="accent-blue-500 cursor-pointer"
              />
              <label htmlFor="thirdPartyToggle" className="text-dev-muted cursor-pointer text-[11px]">
                Capture Third-Party APIs
              </label>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
