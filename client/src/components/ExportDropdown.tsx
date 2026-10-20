import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import type { CrawlSession } from '../types';
import { exportAsJson, exportAsCsv, exportAsPostman } from '../utils/exportUtils';

interface ExportDropdownProps {
  session: CrawlSession | null;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!session || session.endpoints.length === 0) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-dev-subtle text-dev-muted border border-dev-border text-xs font-mono opacity-50 cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export</span>
      </button>
    );
  }

  const triggerExport = (type: 'json' | 'csv' | 'postman') => {
    if (type === 'json') exportAsJson(session);
    if (type === 'csv') exportAsCsv(session);
    if (type === 'postman') exportAsPostman(session);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-dev-subtle hover:bg-dev-border/70 text-dev-bright border border-dev-border text-xs font-mono transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded bg-dev-surface border border-dev-border shadow-lg p-1 z-30 font-mono text-xs">
          <button
            onClick={() => triggerExport('json')}
            className="w-full text-left px-2.5 py-1.5 rounded text-dev-text hover:text-dev-bright hover:bg-dev-subtle transition-colors"
          >
            JSON Raw Format
          </button>

          <button
            onClick={() => triggerExport('csv')}
            className="w-full text-left px-2.5 py-1.5 rounded text-dev-text hover:text-dev-bright hover:bg-dev-subtle transition-colors"
          >
            CSV Spreadsheet
          </button>

          <button
            onClick={() => triggerExport('postman')}
            className="w-full text-left px-2.5 py-1.5 rounded text-dev-text hover:text-dev-bright hover:bg-dev-subtle transition-colors"
          >
            Postman Collection (v2.1)
          </button>
        </div>
      )}
    </div>
  );
};
