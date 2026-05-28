import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

interface ResizableLayoutProps {
  children: ReactNode[];
  defaultSizes: number[];
  minSizes?: number[];
}

export function ResizableLayout({ children, defaultSizes, minSizes }: ResizableLayoutProps) {
  const [sizes, setSizes] = useState<number[]>(defaultSizes);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; startX: number; startSizes: number[] } | null>(null);

  const mins = minSizes || children.map(() => 100);

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      index,
      startX: e.clientX,
      startSizes: [...sizes],
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sizes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current || !containerRef.current) return;

    const { index, startX, startSizes } = dragRef.current;
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startX;
    const deltaPercent = (deltaX / containerWidth) * 100;

    const newSizes = [...startSizes];
    const leftNew = Math.max(mins[index], startSizes[index] + deltaPercent);
    const rightNew = Math.max(mins[index + 1], startSizes[index + 1] - deltaPercent);

    // Only update if both panels meet minimum size
    if (leftNew >= mins[index] && rightNew >= mins[index + 1]) {
      newSizes[index] = leftNew;
      newSizes[index + 1] = rightNew;
      setSizes(newSizes);
    }
  }, [mins]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {children.map((child, index) => (
        <div key={index} style={{ display: 'contents' }}>
          <div style={{
            width: `${sizes[index]}%`,
            minWidth: mins[index],
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {child}
          </div>
          {index < children.length - 1 && (
            <div
              className="resize-handle"
              onMouseDown={(e) => handleMouseDown(index, e)}
              style={{
                width: 6,
                cursor: 'col-resize',
                background: 'transparent',
                flexShrink: 0,
                transition: 'background 0.15s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'var(--accent-blue)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'transparent';
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
