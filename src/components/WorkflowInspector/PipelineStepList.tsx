/**
 * PipelineStepList — vertical timeline of PipelineStepCards.
 *
 * Renders an empty-state when there are no steps, otherwise a column of
 * step cards connected by a 1px vertical line (CSS).
 */

import type { WorkflowRun, WorkflowStep } from '../../shader-agent/integration/workflow-types';
import { PipelineStepCard } from './PipelineStepCard';

interface PipelineStepListProps {
  steps: WorkflowStep[];
  defaultOpenFirst?: boolean;
  emptyHint?: string;
  runStatus: WorkflowRun['status'];
}

export function PipelineStepList({
  steps,
  defaultOpenFirst = false,
  emptyHint = 'No steps captured for this run yet.',
  runStatus,
}: PipelineStepListProps) {
  if (steps.length === 0) {
    return (
      <div className="workflow-empty">
        {emptyHint}
        {runStatus === 'idle' && (
          <div className="workflow-empty__hint">Generate a shader to see the pipeline here.</div>
        )}
      </div>
    );
  }

  return (
    <div className="workflow-step-list">
      {steps.map((step, i) => (
        <PipelineStepCard
          key={`${step.kind}-${step.index}-${i}`}
          step={step}
          defaultOpen={defaultOpenFirst && i === 0}
        />
      ))}
    </div>
  );
}
