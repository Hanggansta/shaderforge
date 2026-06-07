/**
 * PipelineHeader — top summary of a WorkflowRun.
 *
 * Shows: status dot, prompt (truncated), current stage, total duration,
 * final result. Compact (3-4 rows, 12px) and stays at the top of the
 * drawer above the step list.
 */

import type { WorkflowRun } from '../../shader-agent/integration/workflow-types';
import { STEP_TITLE } from '../../shader-agent/integration/workflow-types';
import { StepStatusBadge } from './StepStatusBadge';

interface PipelineHeaderProps {
  run: WorkflowRun;
}

function formatTotalDuration(ms: number | undefined): string {
  if (ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function PipelineHeader({ run }: PipelineHeaderProps) {
  const currentStageLabel = run.currentStage ? STEP_TITLE[run.currentStage] : null;
  const promptShort = run.userPrompt.length > 80 ? run.userPrompt.slice(0, 80) + '…' : run.userPrompt;

  return (
    <div className="workflow-pipeline-header" data-testid="pipeline-header">
      <div className="workflow-pipeline-header__row">
        <span style={{ flexShrink: 0 }}>
          <StepStatusBadge
            status={run.status === 'success' ? 'success' : run.status === 'failed' ? 'error' : run.status === 'running' ? 'running' : 'pending'}
            size="sm"
          />
        </span>
        <span className="workflow-pipeline-header__prompt" title={run.userPrompt}>
          {promptShort || '(no prompt)'}
        </span>
      </div>
      <div className="workflow-pipeline-header__row">
        <span className="workflow-pipeline-header__label">stage</span>
        <span className="workflow-pipeline-header__value">{currentStageLabel ?? '—'}</span>
        <span className="workflow-pipeline-header__label" style={{ marginLeft: 12 }}>duration</span>
        <span className="workflow-pipeline-header__value">{formatTotalDuration(run.totalDurationMs)}</span>
      </div>
      <div className="workflow-pipeline-header__row">
        <span className="workflow-pipeline-header__label">result</span>
        <span className="workflow-pipeline-header__value">{run.status}</span>
        {run.visualScore !== undefined && (
          <>
            <span className="workflow-pipeline-header__label" style={{ marginLeft: 12 }}>visual</span>
            <span className="workflow-pipeline-header__value">{run.visualScore}/100</span>
          </>
        )}
      </div>
    </div>
  );
}
