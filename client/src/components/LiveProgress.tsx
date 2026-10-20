import React from 'react';
import type { CrawlSession } from '../types';

interface LiveProgressProps {
  session: CrawlSession;
  onStop: () => void;
}

export const LiveProgress: React.FC<LiveProgressProps> = ({ session, onStop }) => {
  const { status, stats, config, currentUrl } = session;
  const maxPages = config.maxPages || 20;
  const progressPercent = Math.min(100, Math.round((stats.pagesScanned / maxPages) * 100));
  const isRunning = status === 'running';

  return (
    <div className="dev-card p-3.5 rounded-lg space-y-2.5">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : status === 'completed' ? 'bg-blue-400' : 'bg-slate-500'}`} />
          <span className="font-semibold text-dev-bright">
            {isRunning ? 'Scanning' : status === 'completed' ? 'Scan Completed' : 'Session Stopped'}
          </span>
          <span className="text-dev-muted">({stats.pagesScanned} / {maxPages} pages)</span>
        </div>

        {isRunning && (
          <button
            onClick={onStop}
            className="text-[11px] px-2 py-0.5 rounded border border-red-800 text-red-400 hover:bg-red-950/40 transition-colors"
          >
            Abort Scan
          </button>
        )}
      </div>

      {currentUrl && isRunning && (
        <div className="text-[11px] font-mono text-dev-muted truncate">
          Active: <span className="text-dev-text">{currentUrl}</span>
        </div>
      )}

      {/* Thin linear progress bar */}
      <div className="w-full h-1 rounded-full bg-dev-subtle overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${Math.max(2, progressPercent)}%` }}
        />
      </div>
    </div>
  );
};
