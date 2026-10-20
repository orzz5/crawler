import React from 'react';
import type { CrawlStats } from '../types';

interface StatsOverviewProps {
  stats: CrawlStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${m}m ${remS < 10 ? '0' : ''}${remS}s`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
      <div className="dev-card p-3 rounded-lg">
        <div className="text-[11px] font-mono text-dev-muted uppercase tracking-wider">Pages Scanned</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono text-dev-bright">{stats.pagesScanned}</span>
          <span className="text-xs font-mono text-dev-muted">/ {stats.pagesQueued}</span>
        </div>
      </div>

      <div className="dev-card p-3 rounded-lg">
        <div className="text-[11px] font-mono text-dev-muted uppercase tracking-wider">Total Endpoints</div>
        <div className="mt-1">
          <span className="text-xl font-bold font-mono text-dev-bright">{stats.totalApisFound}</span>
        </div>
      </div>

      <div className="dev-card p-3 rounded-lg">
        <div className="text-[11px] font-mono text-dev-muted uppercase tracking-wider">Public (Open)</div>
        <div className="mt-1">
          <span className="text-xl font-bold font-mono text-emerald-400">{stats.publicApisFound}</span>
        </div>
      </div>

      <div className="dev-card p-3 rounded-lg">
        <div className="text-[11px] font-mono text-dev-muted uppercase tracking-wider">Protected (Auth)</div>
        <div className="mt-1">
          <span className="text-xl font-bold font-mono text-amber-400">{stats.protectedApisFound}</span>
        </div>
      </div>

      <div className="dev-card p-3 rounded-lg col-span-2 sm:col-span-1">
        <div className="text-[11px] font-mono text-dev-muted uppercase tracking-wider">Duration</div>
        <div className="mt-1">
          <span className="text-xl font-bold font-mono text-dev-bright">{formatTime(stats.durationMs)}</span>
        </div>
      </div>
    </div>
  );
};
