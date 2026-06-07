/**
 * Drawer integration tests — verify static rendering, empty state, override
 * mode, and run-picker slot.
 *
 * Uses `react-dom/server.renderToString` (no DOM environment). The data
 * load from `shaderAgent.getRuns()` happens in `useEffect`, which does
 * not fire under SSR — so we only test initial render states here.
 * The real data-loading path is verified manually via `npm run dev`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';

const mockGetRuns = vi.fn();
vi.mock('../../../shader-agent/integration/service', () => ({
  shaderAgent: {
    getRuns: () => mockGetRuns(),
  },
}));

vi.mock('../adapters/runArtifactToWorkflowRun', () => ({
  runArtifactToWorkflowRun: (artifact: { id: string; createdAt: number; userPrompt: string }) => ({
    id: artifact.id,
    createdAt: artifact.createdAt,
    userPrompt: artifact.userPrompt,
    workflow: 'generate' as const,
    status: 'success' as const,
    steps: [],
  }),
}));

import { WorkflowInspectorDrawer } from '../WorkflowInspectorDrawer';
import { MOCK_RUN_SUCCESS } from '../__mocks__';

beforeEach(() => {
  mockGetRuns.mockReset();
  mockGetRuns.mockReturnValue([]);
});

describe('WorkflowInspectorDrawer (SSR initial render)', () => {
  it('shows MOCK_RUN_SUCCESS as visual demo when no runOverride and store empty', () => {
    const html = renderToString(
      createElement(WorkflowInspectorDrawer, { open: true, onClose: () => {} }),
    );
    expect(html).toContain('workflow-drawer open');
    expect(html).toContain('a black hole with violet accretion disk');
    expect(html).toContain('Visual Structurer');
  });

  it('hides run picker when override is set (override = presentational mode)', () => {
    const html = renderToString(
      createElement(WorkflowInspectorDrawer, {
        open: true,
        onClose: () => {},
        runOverride: MOCK_RUN_SUCCESS,
      }),
    );
    expect(html).toContain('a black hole with violet accretion disk');
    expect(html).toContain('Visual Structurer');
    expect(html).not.toContain('data-testid="run-picker"');
  });

  it('renders the run picker placeholder in non-override mode', () => {
    const html = renderToString(
      createElement(WorkflowInspectorDrawer, { open: true, onClose: () => {} }),
    );
    expect(html).toContain('workflow-run-picker');
    expect(html).toContain('No runs yet');
    expect(html).toContain('↻');
  });

  it('toggles drawer open class', () => {
    const openHtml = renderToString(
      createElement(WorkflowInspectorDrawer, { open: true, onClose: () => {} }),
    );
    expect(openHtml).toContain('workflow-drawer open');
    expect(openHtml).toContain('aria-hidden="false"');

    const closedHtml = renderToString(
      createElement(WorkflowInspectorDrawer, { open: false, onClose: () => {} }),
    );
    expect(closedHtml).toMatch(/class="workflow-drawer\s/);
    expect(closedHtml).toContain('aria-hidden="true"');
  });

  it('renders close button with ×', () => {
    const html = renderToString(
      createElement(WorkflowInspectorDrawer, { open: true, onClose: () => {} }),
    );
    expect(html).toContain('workflow-drawer__close');
    expect(html).toContain('×');
  });

  it('sets aria-label for accessibility', () => {
    const html = renderToString(
      createElement(WorkflowInspectorDrawer, { open: true, onClose: () => {} }),
    );
    expect(html).toContain('aria-label="Workflow Inspector"');
    expect(html).toContain('role="complementary"');
  });
});
