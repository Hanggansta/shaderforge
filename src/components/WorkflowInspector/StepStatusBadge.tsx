/**
 * StepStatusBadge — 8px colored dot + status label.
 *
 * Reuses the existing `.status-indicator` CSS class as the dot base, and
 * adds new modifier classes (.running / .warning / .skipped / .cancelled)
 * for the WorkflowStepStatus union.
 *
 * Colors are bound to the existing CSS variables so themes stay consistent
 * with the rest of the app (--accent-blue / -green / -red / -yellow).
 */

import type { WorkflowStepStatus } from '../../shader-agent/integration/workflow-types';

interface StepStatusBadgeProps {
  status: WorkflowStepStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const STATUS_LABEL: Record<WorkflowStepStatus, string> = {
  pending: 'pending',
  running: 'running',
  success: 'success',
  warning: 'warning',
  error: 'error',
  skipped: 'skipped',
  cancelled: 'cancelled',
};

const DOT_CLASS: Record<WorkflowStepStatus, string> = {
  pending: 'status-indicator idle',
  running: 'status-indicator workflow-step-dot--running',
  success: 'status-indicator success',
  warning: 'status-indicator workflow-step-dot--warning',
  error: 'status-indicator error',
  skipped: 'status-indicator workflow-step-dot--skipped',
  cancelled: 'status-indicator workflow-step-dot--cancelled',
};

export function StepStatusBadge({ status, size = 'md', showLabel = true }: StepStatusBadgeProps) {
  const fontSize = size === 'sm' ? 10 : 11;
  const dotSize = size === 'sm' ? 6 : 8;

  return (
    <span
      className="workflow-step-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize,
        color: 'var(--text-secondary)',
      }}
      data-status={status}
    >
      <span
        className={DOT_CLASS[status]}
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {showLabel && <span style={{ textTransform: 'lowercase' }}>{STATUS_LABEL[status]}</span>}
    </span>
  );
}
