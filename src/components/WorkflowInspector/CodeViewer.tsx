/**
 * CodeViewer — display GLSL / JSON / arbitrary code in monospace, with
 * maxHeight scroll. Truncates very long content (>5000 chars) with a
 * "show more" toggle.
 */

import { useState, type ReactNode } from 'react';

interface CodeViewerProps {
  code: string;
  language?: string;
  maxHeight?: number;
  maxInlineLength?: number;
  emptyText?: string;
  rightSlot?: ReactNode;
}

export function CodeViewer({
  code,
  language,
  maxHeight = 300,
  maxInlineLength = 5000,
  emptyText = '(empty)',
  rightSlot,
}: CodeViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const isEmpty = !code || code.length === 0;
  const isLong = code.length > maxInlineLength;
  const display = !isLong || expanded ? code : `${code.slice(0, maxInlineLength)}\n… (+${code.length - maxInlineLength} chars)`;

  return (
    <div className="workflow-code-viewer" style={{ position: 'relative' }}>
      {(language !== undefined || rightSlot !== undefined) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 0',
            fontSize: 10,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)' }}>{language ?? ''}</span>
          {rightSlot}
        </div>
      )}
      <pre
        style={{
          background: 'var(--bg-primary)',
          padding: 8,
          borderRadius: 4,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: isEmpty ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontStyle: isEmpty ? 'italic' : 'normal',
          overflow: 'auto',
          maxHeight,
          whiteSpace: 'pre',
          wordBreak: 'normal',
          border: '1px solid var(--border-color)',
          margin: 0,
        }}
      >
        <code>{isEmpty ? emptyText : display}</code>
      </pre>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 4,
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-blue)',
            fontSize: 10,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          {expanded ? '▴ show less' : '▾ show all'}
        </button>
      )}
    </div>
  );
}
