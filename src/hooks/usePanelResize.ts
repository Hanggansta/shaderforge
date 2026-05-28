import { useCallback, useRef } from 'react';
import { useUiStore, type PanelId } from '../store/uiStore';

interface PanelConstraints {
  min: number;
  max: number | (() => number);
}

const PANEL_CONSTRAINTS: Record<PanelId, PanelConstraints> = {
  ai: { min: 240, max: 460 },
  editor: { min: 300, max: Infinity },
  preview: { min: 320, max: () => window.innerWidth * 0.55 },
};

export function usePanelResize(leftPanel: PanelId, rightPanel: PanelId) {
  const dragRef = useRef<{ startX: number; startLeftWidth: number; startRightWidth: number } | null>(null);

  const getMaxWidth = (panel: PanelId): number => {
    const constraint = PANEL_CONSTRAINTS[panel];
    return typeof constraint.max === 'function' ? constraint.max() : constraint.max;
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.add('active');

    // Find adjacent panel elements via DOM siblings
    const leftEl = target.previousElementSibling as HTMLElement | null;
    const rightEl = target.nextElementSibling as HTMLElement | null;

    const leftWidth = leftEl?.getBoundingClientRect().width ?? 300;
    const rightWidth = rightEl?.getBoundingClientRect().width ?? 400;

    dragRef.current = {
      startX: e.clientX,
      startLeftWidth: leftWidth,
      startRightWidth: rightWidth,
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;

      const deltaX = ev.clientX - dragRef.current.startX;
      const leftMin = PANEL_CONSTRAINTS[leftPanel].min;
      const leftMax = getMaxWidth(leftPanel);
      const rightMin = PANEL_CONSTRAINTS[rightPanel].min;
      const rightMax = getMaxWidth(rightPanel);

      let newLeftWidth = dragRef.current.startLeftWidth + deltaX;
      let newRightWidth = dragRef.current.startRightWidth - deltaX;

      // Clamp each panel
      newLeftWidth = Math.max(leftMin, Math.min(leftMax, newLeftWidth));
      newRightWidth = Math.max(rightMin, Math.min(rightMax, newRightWidth));

      // If clamping broke the total, redistribute
      const totalWidth = dragRef.current.startLeftWidth + dragRef.current.startRightWidth;
      if (newLeftWidth + newRightWidth > totalWidth) {
        if (newLeftWidth === leftMin || newLeftWidth === leftMax) {
          newRightWidth = totalWidth - newLeftWidth;
        } else if (newRightWidth === rightMin || newRightWidth === rightMax) {
          newLeftWidth = totalWidth - newRightWidth;
        }
      }

      // Final clamp
      newLeftWidth = Math.max(leftMin, Math.min(leftMax, newLeftWidth));
      newRightWidth = Math.max(rightMin, Math.min(rightMax, newRightWidth));

      const { setPanelWidth } = useUiStore.getState();
      setPanelWidth(leftPanel, Math.round(newLeftWidth));
      setPanelWidth(rightPanel, Math.round(newRightWidth));
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      target.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [leftPanel, rightPanel]);

  return { handlePointerDown };
}
