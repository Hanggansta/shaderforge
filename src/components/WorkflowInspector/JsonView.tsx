/**
 * JsonView — recursive JSON tree renderer (no external deps).
 *
 * - Keys colored cyan (var(--accent-blue))
 * - Strings colored green (var(--accent-green))
 * - Numbers colored purple (var(--accent-purple))
 * - booleans / null colored secondary
 * - Objects and arrays collapse/expand at each level (default: top-level open)
 * - Long strings (>80 chars) collapsed into a single-line preview
 */

import { useState, type CSSProperties } from 'react';

interface JsonViewProps {
  value: unknown;
  initialOpen?: boolean;
  maxStringPreview?: number;
  rootLabel?: string;
}

const KEY_STYLE: CSSProperties = {
  color: 'var(--accent-blue)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};
const STRING_STYLE: CSSProperties = {
  color: 'var(--accent-green)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  wordBreak: 'break-all',
};
const NUMBER_STYLE: CSSProperties = {
  color: 'var(--accent-purple)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};
const BOOL_STYLE: CSSProperties = {
  color: 'var(--accent-purple)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontStyle: 'italic',
};
const NULL_STYLE: CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontStyle: 'italic',
};
const PUNCT_STYLE: CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

function previewString(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… (+${s.length - max} chars)`;
}

interface NodeProps {
  k?: string;
  v: unknown;
  depth: number;
  defaultOpen: boolean;
  maxStringPreview: number;
}

function JsonNode({ k, v, depth, defaultOpen, maxStringPreview }: NodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const indent = { paddingLeft: depth * 12 };

  if (v === null) {
    return (
      <div style={indent}>
        {k !== undefined && <span style={KEY_STYLE}>{k}</span>}
        {k !== undefined && <span style={PUNCT_STYLE}>: </span>}
        <span style={NULL_STYLE}>null</span>
      </div>
    );
  }

  switch (typeof v) {
    case 'string':
      return (
        <div style={indent}>
          {k !== undefined && <span style={KEY_STYLE}>{k}</span>}
          {k !== undefined && <span style={PUNCT_STYLE}>: </span>}
          <span style={STRING_STYLE}>"{previewString(v as string, maxStringPreview)}"</span>
        </div>
      );
    case 'number':
      return (
        <div style={indent}>
          {k !== undefined && <span style={KEY_STYLE}>{k}</span>}
          {k !== undefined && <span style={PUNCT_STYLE}>: </span>}
          <span style={NUMBER_STYLE}>{String(v)}</span>
        </div>
      );
    case 'boolean':
      return (
        <div style={indent}>
          {k !== undefined && <span style={KEY_STYLE}>{k}</span>}
          {k !== undefined && <span style={PUNCT_STYLE}>: </span>}
          <span style={BOOL_STYLE}>{String(v)}</span>
        </div>
      );
    case 'object': {
      const obj = v as Record<string, unknown>;
      const isArr = Array.isArray(v);
      const entries = isArr
        ? (v as unknown[]).map((item, i) => [String(i), item] as [string, unknown])
        : Object.entries(obj);
      const summary = isArr ? `Array(${entries.length})` : `Object{${entries.length}}`;

      return (
        <div style={indent}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            aria-expanded={open}
          >
            <span style={{ ...PUNCT_STYLE, marginRight: 4 }}>{open ? '▾' : '▸'}</span>
            {k !== undefined && <span style={KEY_STYLE}>{k}</span>}
            {k !== undefined && <span style={PUNCT_STYLE}>: </span>}
            {!open && <span style={NULL_STYLE}>{summary}</span>}
          </button>
          {open && (
            <>
              <span style={PUNCT_STYLE}>{isArr ? '[' : '{'}</span>
              <div style={{ borderLeft: '1px solid var(--border-color)', marginLeft: 4 }}>
                {entries.map(([childK, childV]) => (
                  <JsonNode
                    key={childK}
                    k={isArr ? undefined : childK}
                    v={childV}
                    depth={depth + 1}
                    defaultOpen={defaultOpen && depth < 1}
                    maxStringPreview={maxStringPreview}
                  />
                ))}
              </div>
              <span style={PUNCT_STYLE}>{isArr ? ']' : '}'}</span>
            </>
          )}
        </div>
      );
    }
    default:
      return (
        <div style={indent}>
          {k !== undefined && <span style={KEY_STYLE}>{k}</span>}
          {k !== undefined && <span style={PUNCT_STYLE}>: </span>}
          <span style={NULL_STYLE}>{String(v)}</span>
        </div>
      );
  }
}

export function JsonView({
  value,
  initialOpen = true,
  maxStringPreview = 80,
  rootLabel,
}: JsonViewProps) {
  return (
    <div
      className="workflow-json-view"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        lineHeight: 1.5,
        color: 'var(--text-primary)',
        padding: '4px 0',
      }}
    >
      {rootLabel !== undefined && (
        <div style={{ marginBottom: 2 }}>
          <span style={KEY_STYLE}>{rootLabel}</span>
          <span style={PUNCT_STYLE}>: </span>
        </div>
      )}
      <JsonNode
        v={value}
        depth={0}
        defaultOpen={initialOpen}
        maxStringPreview={maxStringPreview}
      />
    </div>
  );
}
