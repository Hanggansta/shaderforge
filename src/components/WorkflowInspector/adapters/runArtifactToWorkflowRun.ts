/**
 * RunArtifact → WorkflowRun adapter.
 *
 * The V1 shader-agent harness only persists the **final** state of each
 * pipeline stage into a `RunArtifact` (visualCard, shaderPlan, references,
 * compileAttempts[], finalCode, success). It does **not** persist:
 *   - The system prompt sent to any LLM call
 *   - The user prompt as actually sent (may differ from input due to error
 *     context injection in fix mode)
 *   - The raw LLM response per attempt
 *   - Per-step timing
 *   - Token usage
 *   - LLM provider / model
 *
 * So this adapter produces a `WorkflowRun` whose steps have **sparse**
 * fields — most per-step metadata is `undefined`. The Inspector UI must
 * gracefully render those gaps ("Data not captured in V1 harness").
 *
 * Compile retries are reconstructed from `RunArtifact.compileAttempts`:
 * each entry becomes a `shader_compiler` step with its own duration.
 *
 * V2: `RunArtifact.steps?: WorkflowStep[]` will be added and this
 * adapter becomes a thin pass-through.
 */

import type { RunArtifact } from '../../../shader-agent/runs/runs';
import type {
  WorkflowRun,
  WorkflowStep,
  WorkflowStepKind,
  WorkflowStepStatus,
} from '../../../shader-agent/integration/workflow-types';
import { STEP_TITLE } from '../../../shader-agent/integration/workflow-types';

export function runArtifactToWorkflowRun(artifact: RunArtifact): WorkflowRun {
  const steps: WorkflowStep[] = [];
  let idx = 0;

  steps.push({
    kind: 'visual_structurer',
    index: idx++,
    title: STEP_TITLE.visual_structurer,
    status: 'success',
    input: artifact.userPrompt,
    output: artifact.visualCard,
    notes: 'Output: VisualCard (ShaderSpec).',
  });

  steps.push({
    kind: 'shader_planner',
    index: idx++,
    title: STEP_TITLE.shader_planner,
    status: 'success',
    input: artifact.visualCard,
    output: artifact.shaderPlan,
    notes: 'Deterministic — no LLM call.',
  });

  steps.push({
    kind: 'reference_selector',
    index: idx++,
    title: STEP_TITLE.reference_selector,
    status: 'success',
    input: { visualCard: artifact.visualCard, shaderPlan: artifact.shaderPlan },
    output: artifact.references,
    notes: `Selected ${artifact.references.length} reference card(s).`,
  });

  const compileCount = artifact.compileAttempts.length;
  const firstCompileFailed = compileCount > 0 && !artifact.compileAttempts[0].ok;
  const needsFixRetry = firstCompileFailed && artifact.success && compileCount > 1;

  if (needsFixRetry) {
    steps.push({
      kind: 'code_agent_generate',
      index: idx++,
      title: STEP_TITLE.code_agent_generate,
      status: 'success',
      notes: 'First-pass code; compile failed — V1 harness does not persist the raw first-pass response.',
    });
    for (let i = 1; i < compileCount; i++) {
      steps.push({
        kind: 'code_agent_fix_compile',
        index: idx++,
        title: `${STEP_TITLE.code_agent_fix_compile} #${i}`,
        status: 'success',
        notes: 'V1 harness does not persist the raw fix-retry response.',
      });
    }
  } else {
    steps.push({
      kind: 'code_agent_generate',
      index: idx++,
      title: STEP_TITLE.code_agent_generate,
      status: artifact.success ? 'success' : compileCount > 0 ? 'warning' : 'pending',
      output: artifact.finalCode ?? undefined,
      notes: artifact.success
        ? 'Output: final GLSL mainImage().'
        : compileCount > 0
        ? 'Last attempt code (compile failed).'
        : 'No code produced.',
    });
  }

  artifact.compileAttempts.forEach((report, i) => {
    const status: WorkflowStepStatus = report.ok ? 'success' : 'error';
    const baseTitle = compileCount > 1 ? `${STEP_TITLE.shader_compiler} #${i + 1}` : STEP_TITLE.shader_compiler;
    steps.push({
      kind: 'shader_compiler',
      index: idx++,
      title: baseTitle,
      status,
      durationMs: report.durationMs,
      output: report,
      error: report.ok
        ? undefined
        : {
            message: report.errors.map((e) => `L${e.line}: ${e.message}`).join('; '),
          },
      notes: report.ok ? 'Compiled successfully.' : `Compile failed: ${report.errors.length} error(s).`,
    });
  });

  if (artifact.success && artifact.screenshots && artifact.screenshots.length > 0) {
    steps.push({
      kind: 'screenshot_renderer',
      index: idx++,
      title: STEP_TITLE.screenshot_renderer,
      status: 'success',
      output: { frameCount: artifact.screenshots.length },
      notes: `Rendered ${artifact.screenshots.length} frame(s).`,
    });
  } else if (artifact.success) {
    steps.push({
      kind: 'screenshot_renderer',
      index: idx++,
      title: STEP_TITLE.screenshot_renderer,
      status: 'skipped',
      notes: 'Screenshot renderer not invoked (no screenshot option passed).',
    });
  }

  const totalDurationMs = steps
    .map((s) => s.durationMs ?? 0)
    .reduce((a, b) => a + b, 0);

  const status: WorkflowRun['status'] = artifact.success
    ? 'success'
    : artifact.attempts > 0
    ? 'failed'
    : 'idle';

  return {
    id: artifact.id,
    createdAt: artifact.createdAt,
    finishedAt: artifact.createdAt + totalDurationMs,
    totalDurationMs: totalDurationMs > 0 ? totalDurationMs : undefined,
    userPrompt: artifact.userPrompt,
    workflow: 'generate',
    status,
    currentStage: undefined,
    steps,
    finalCode: artifact.finalCode ?? undefined,
    visualCard: artifact.visualCard,
    shaderPlan: artifact.shaderPlan,
    references: artifact.references,
    compileAttempts: artifact.compileAttempts,
    visualScore: artifact.visualScore,
    screenshots: artifact.screenshots,
  };
}

export const __WORKFLOW_STEP_KINDS: readonly WorkflowStepKind[] = [
  'visual_structurer',
  'shader_planner',
  'reference_selector',
  'code_agent_generate',
  'code_agent_fix_compile',
  'code_agent_fix_feedback',
  'shader_compiler',
  'screenshot_renderer',
] as const;
