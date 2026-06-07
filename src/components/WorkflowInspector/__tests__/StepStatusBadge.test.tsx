/**
 * StepStatusBadge smoke tests — verify status class + label mapping.
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { StepStatusBadge } from '../StepStatusBadge';
import type { WorkflowStepStatus } from '../../../shader-agent/integration/workflow-types';

const STATUSES: WorkflowStepStatus[] = [
  'pending',
  'running',
  'success',
  'warning',
  'error',
  'skipped',
  'cancelled',
];

describe('StepStatusBadge', () => {
  it.each(STATUSES)('renders %s status with correct label', (status) => {
    const html = renderToString(createElement(StepStatusBadge, { status }));
    expect(html).toContain(`data-status="${status}"`);
    expect(html).toContain(status);
  });

  it('hides label when showLabel=false', () => {
    const html = renderToString(
      createElement(StepStatusBadge, { status: 'success', showLabel: false }),
    );
    expect(html).toContain('data-status="success"');
    expect(html).not.toContain('>success<');
  });

  it('uses running-specific CSS class', () => {
    const html = renderToString(createElement(StepStatusBadge, { status: 'running' }));
    expect(html).toContain('workflow-step-dot--running');
  });

  it('uses error CSS class (reuses existing .error class)', () => {
    const html = renderToString(createElement(StepStatusBadge, { status: 'error' }));
    expect(html).toMatch(/status-indicator error/);
  });

  it('applies size sm', () => {
    const html = renderToString(
      createElement(StepStatusBadge, { status: 'pending', size: 'sm' }),
    );
    expect(html).toMatch(/width:\s*6px/);
  });
});
