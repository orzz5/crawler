import React from 'react';
import { Terminal } from 'lucide-react';

interface HeaderProps {
  isCrawling: boolean;
  targetUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({ isCrawling, targetUrl }) => {
  return (
    <header className="border-b border-dev-border bg-dev-surface/90 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-dev-subtle border border-dev-border text-dev-text">
            <Terminal className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-dev-bright tracking-tight">Endpoint Inspector</span>
            <span className="text-[11px] font-mono text-dev-muted px-1.5 py-0.5 rounded bg-dev-subtle border border-dev-border">
              v1.2
            </span>
          </div>

          {targetUrl && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono text-dev-muted pl-3 border-l border-dev-border">
              <span className="truncate max-w-xs">{targetUrl}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isCrawling ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-dev-muted">{isCrawling ? 'Scanning...' : 'Idle'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
