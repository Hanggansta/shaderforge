/**
 * CollapsibleSection — generic fold/unfold container.
 *
 * Renders a clickable header (▸/▾ + title + optional right-aligned badge) and
 * a body that shows/hides instantly (no animation — we have no animation
 * library installed and want zero deps for V1).
 *
 * State is uncontrolled by default but can be controlled via `open` + `onOpenChange`.
 */

import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  badge?: ReactNode;
  rightSlot?: ReactNode;
  titleStyle?: React.CSSProperties;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  badge,
  rightSlot,
  titleStyle,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const toggle = (): void => {
    if (isControlled) {
      onOpenChange?.(!isOpen);
    } else {
      setInternalOpen(!isOpen);
    }
  };

  return (
    <div className="workflow-collapsible">
      <button
        type="button"
        onClick={toggle}
        className="workflow-collapsible__header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: '4px 6px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: 11,
          fontWeight: 500,
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
          ...titleStyle,
        }}
        aria-expanded={isOpen}
        data-testid="collapsible-header"
      >
        <span
          style={{
            display: 'inline-block',
            width: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            transition: 'transform 0.12s ease',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize: 10,
          }}
          aria-hidden="true"
        >
          ▸
        </span>
        <span style={{ flex: 1 }}>{title}</span>
        {badge !== undefined && badge !== null && (
          <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{badge}</span>
        )}
        {rightSlot}
      </button>
      {isOpen && (
        <div
          className="workflow-collapsible__body"
          style={{
            padding: '4px 6px 8px 22px',
            fontSize: 11,
            color: 'var(--text-primary)',
          }}
          data-testid="collapsible-body"
        >
          {children}
        </div>
      )}
    </div>
  );
}
