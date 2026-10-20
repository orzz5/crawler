import React, { useState, useRef, useEffect } from 'react';
import { Trash2, ArrowDown, Filter } from 'lucide-react';
import type { LogMessage, LogLevel } from '../types';

interface LiveLogViewerProps {
  logs: LogMessage[];
  onClear: () => void;
}

export const LiveLogViewer: React.FC<LiveLogViewerProps> = ({ logs, onClear }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    if (filterLevel === 'API') return log.level === 'api';
    if (filterLevel === 'ERROR') return log.level === 'error';
    if (filterLevel === 'WARN') return log.level === 'warn';
    return log.level === filterLevel.toLowerCase();
  });

  const getBadge = (level: LogLevel) => {
    switch (level) {
      case 'api':
        return <span className="text-[10px] font-mono text-emerald-400 font-bold">[API]</span>;
      case 'success':
        return <span className="text-[10px] font-mono text-blue-400 font-bold">[OK]</span>;
      case 'error':
        return <span className="text-[10px] font-mono text-red-400 font-bold">[ERR]</span>;
      case 'warn':
        return <span className="text-[10px] font-mono text-amber-400 font-bold">[WARN]</span>;
      default:
        return <span className="text-[10px] font-mono text-dev-muted font-bold">[LOG]</span>;
    }
  };

  return (
    <div className="dev-card rounded-lg overflow-hidden border border-dev-border flex flex-col h-60">
      <div className="bg-dev-subtle px-3 py-1.5 border-b border-dev-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-dev-muted text-[11px]">Stream Logs ({filteredLogs.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-dev-muted">
            <Filter className="w-3 h-3" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent text-dev-text focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-dev-surface">All</option>
              <option value="API" className="bg-dev-surface">APIs Only</option>
              <option value="INFO" className="bg-dev-surface">Info</option>
              <option value="WARN" className="bg-dev-surface">Warnings</option>
              <option value="ERROR" className="bg-dev-surface">Errors</option>
            </select>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded text-xs transition-colors ${
              autoScroll ? 'text-blue-400' : 'text-dev-muted hover:text-dev-text'
            }`}
            title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll paused'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClear}
            className="p-1 rounded text-dev-muted hover:text-red-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-2.5 overflow-y-auto space-y-1 font-mono text-[11px] bg-dev-bg select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-dev-muted text-xs">
            Awaiting network traffic...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-dev-muted shrink-0 text-[10px]">{timeStr}</span>
                <span className="shrink-0">{getBadge(log.level)}</span>
                <span className={`break-all ${log.level === 'api' ? 'text-emerald-300' : log.level === 'error' ? 'text-red-400' : 'text-dev-text'}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
