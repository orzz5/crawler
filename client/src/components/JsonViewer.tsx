import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  maxHeight?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, maxHeight = 'max-h-96' }) => {
  const [copied, setCopied] = useState(false);

  if (data === null || data === undefined) {
    return <div className="text-dev-muted italic text-xs py-1.5 font-mono">No body content</div>;
  }

  const isObject = typeof data === 'object';
  const rawString = isObject ? JSON.stringify(data, null, 2) : String(data);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightJson = (json: string) => {
    if (!isObject) return json;

    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = 'text-amber-400'; // number
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'text-blue-400'; // key
            } else {
              cls = 'text-emerald-400'; // string value
            }
          } else if (/true|false/.test(match)) {
            cls = 'text-purple-400'; // boolean
          } else if (/null/.test(match)) {
            cls = 'text-red-400'; // null
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
  };

  return (
    <div className="rounded border border-dev-border bg-dev-bg overflow-hidden font-mono text-xs">
      <div className="bg-dev-subtle px-3 py-1.5 border-b border-dev-border flex items-center justify-between text-[11px] text-dev-muted">
        <div>
          {isObject ? (Array.isArray(data) ? `Array [${data.length}]` : 'JSON') : 'Text'} •{' '}
          {(new Blob([rawString]).size / 1024).toFixed(2)} KB
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-dev-bright transition-colors"
          title="Copy payload"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className={`p-3 overflow-auto ${maxHeight} leading-relaxed select-text`}>
        {isObject ? (
          <pre
            className="whitespace-pre text-dev-text font-mono"
            dangerouslySetInnerHTML={{ __html: highlightJson(rawString) }}
          />
        ) : (
          <pre className="whitespace-pre-wrap text-dev-text font-mono">{rawString}</pre>
        )}
      </div>
    </div>
  );
};
