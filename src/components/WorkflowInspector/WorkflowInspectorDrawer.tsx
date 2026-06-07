/**
 * WorkflowInspectorDrawer — right-side slide-in panel.
 *
 * Self-contained: reads `shaderAgent.getRuns()` on open and on manual
 * refresh. Shows a dropdown of available runs (newest first) above the
 * pipeline content. Falls back to `MOCK_RUN_SUCCESS` when the store is
 * empty so the UI is never blank during a session.
 *
 * Position: absolute relative to its `.panel-content` parent (in PreviewPanel).
 * Width 420px. Animates in via CSS transform.
 */

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { WorkflowRun } from '../../shader-agent/integration/workflow-types';
import { shaderAgent } from '../../shader-agent/integration/service';
import { runArtifactToWorkflowRun } from './adapters/runArtifactToWorkflowRun';
import { MOCK_RUN_SUCCESS, MOCK_RUN_EMPTY } from './__mocks__';
import { PipelineHeader } from './PipelineHeader';
import { PipelineStepList } from './PipelineStepList';

interface WorkflowInspectorDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Override the displayed run (e.g. for testing). If undefined, drawer
   *  loads from runsStore. */
  runOverride?: WorkflowRun | null;
}

function shortId(id: string): string {
  return id.length > 16 ? id.slice(0, 14) + '…' : id;
}

function formatTimestamp(ts: number): string {
  if (ts <= 0) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function RunPicker({
  runs,
  selectedId,
  onSelect,
  onRefresh,
}: {
  runs: WorkflowRun[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}): ReactNode {
  if (runs.length === 0) {
    return (
      <div className="workflow-run-picker">
        <span>No runs yet</span>
        <button type="button" onClick={onRefresh} title="Refresh">↻</button>
      </div>
    );
  }

  return (
    <div className="workflow-run-picker">
      <span>Run</span>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        data-testid="run-picker"
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {shortId(r.id)} — {r.status} — {formatTimestamp(r.createdAt)}
          </option>
        ))}
      </select>
      <button type="button" onClick={onRefresh} title="Refresh runs">↻</button>
    </div>
  );
}

export function WorkflowInspectorDrawer({ open, onClose, runOverride }: WorkflowInspectorDrawerProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback((): void => {
    const artifacts = shaderAgent.getRuns();
    const adapted = artifacts.map(runArtifactToWorkflowRun);
    setRuns(adapted);
    if (adapted.length > 0 && (selectedId === null || !adapted.some((r) => r.id === selectedId))) {
      setSelectedId(adapted[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    if (open) {
      // Trigger initial load on first open. The effect runs in response to
      // a prop change (open), which is an external event, so suppressing
      // the set-state-in-effect rule is correct here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    }
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'textarea' || target?.isContentEditable) return;
        if (target?.closest('.monaco-editor')) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const selectedRun = useMemo<WorkflowRun | null>(() => {
    if (runOverride !== undefined) return runOverride;
    if (runs.length === 0) return null;
    return runs.find((r) => r.id === selectedId) ?? runs[0];
  }, [runOverride, runs, selectedId]);

  const displayRun = useMemo<WorkflowRun>(() => {
    if (selectedRun) return selectedRun;
    if (runs.length === 0) return MOCK_RUN_SUCCESS;
    return MOCK_RUN_EMPTY;
  }, [selectedRun, runs.length]);

  return (
    <aside
      className={`workflow-drawer ${open ? 'open' : ''}`}
      data-testid="workflow-drawer"
      aria-hidden={!open}
      role="complementary"
      aria-label="Workflow Inspector"
    >
      <div className="workflow-drawer__header">
        <span className="workflow-drawer__title">Workflow Inspector</span>
        <button
          type="button"
          className="workflow-drawer__close"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close workflow inspector"
        >
          ×
        </button>
      </div>

      {runOverride === undefined && (
        <RunPicker
          runs={runs}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRefresh={refresh}
        />
      )}

      <div className="workflow-drawer__body">
        {displayRun.status === 'idle' && runs.length === 0 ? (
          <div className="workflow-empty">
            No runs yet.
            <div className="workflow-empty__hint">Generate a shader in the AI Copilot to see the pipeline.</div>
          </div>
        ) : (
          <>
            <PipelineHeader run={displayRun} />
            <PipelineStepList steps={displayRun.steps} runStatus={displayRun.status} defaultOpenFirst={false} />
          </>
        )}
      </div>
    </aside>
  );
}
