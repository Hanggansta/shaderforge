/**
 * Generate Workflow — the fixed pipeline that turns a user prompt into a
 * compile-passing shader with artifacts.
 */

import type { LLMClient } from '../llm-client';
import type { AIProvider } from '../integration/types/ai-provider';
import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import type { ShaderResult, ScreenshotFrame } from '../schemas/shader-result';
import { runVisualStructurer } from '../agents/visual-structurer';
import { runShaderPlanner } from '../agents/shader-planner';
import { runCodePatchAgent } from '../agents/code-patch-agent';
import { renderScreenshots } from '../tools/screenshot-renderer';
import { selectReferences } from '../tools/reference-selector';
import { runCompileFixLoop, type CompileAttemptEvent } from './compile-fix-loop';
import { runsStore, type RunArtifact } from '../runs/runs';
import { assertNotAborted, type WorkflowStepEvent } from '../integration/workflow-progress';

export interface GenerateOptions {
  llm: LLMClient | null;
  provider: AIProvider | null;
  maxAttempts?: number;
  screenshot?: { width: number; height: number; times?: number[] };
  runId?: string;
  /**
   * Pre-scored candidate from Best-of-N reranking. When set, the first-pass
   * Code Agent call is skipped and this code seeds the compile-fix loop.
   */
  initialCode?: string;
  initialRawResponse?: string;
  /** Run post-success visual polish when score is below threshold. Default false. */
  enableVisualPolish?: boolean;
  /** Abort signal — checked between pipeline stages. */
  signal?: AbortSignal;
  /** Per-stage observer for full pipeline progress in the UI. */
  onWorkflowStep?: (event: WorkflowStepEvent) => void;
  /** Per-attempt observer forwarded to the compile-fix loop. */
  onAttempt?: (event: CompileAttemptEvent) => void;
}

export interface GenerateResult extends ShaderResult {
  runId: string;
  compileAttempts: ShaderResult['compileReport'][];
}

export async function generateShader(
  userPrompt: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const runId = options.runId ?? `run-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const emitStep = options.onWorkflowStep;
  const signal = options.signal;

  assertNotAborted(signal);
  emitStep?.({ step: 'visual_structurer', message: 'Structuring visual intent…' });
  const visualCard: VisualCard = await runVisualStructurer(
    { userPrompt },
    options.llm,
    options.provider
  );

  assertNotAborted(signal);
  emitStep?.({ step: 'shader_planner', message: 'Planning shader modules…' });
  const shaderPlan: ShaderPlan = runShaderPlanner({ visualCard });

  assertNotAborted(signal);
  emitStep?.({
    step: 'reference_selector',
    message: 'Selecting reference techniques…',
    details: shaderPlan.baseTechnique,
  });
  const { cards: references } = selectReferences(visualCard, shaderPlan);

  const seededCode = options.initialCode?.trim();
  let initialCode: string;
  let initialRawResponse: string;

  if (seededCode) {
    initialCode = seededCode;
    initialRawResponse = options.initialRawResponse ?? '';
    emitStep?.({ step: 'candidate_rerank', message: 'Using best visual candidate as seed' });
  } else {
    assertNotAborted(signal);
    emitStep?.({ step: 'code_agent', message: 'Generating GLSL…' });
    const firstPass = await runCodePatchAgent(
      {
        mode: 'generate',
        visualCard,
        shaderPlan,
        references,
        userPrompt,
      },
      options.llm
    );
    initialCode = firstPass.code;
    initialRawResponse = firstPass.rawResponse;
  }

  const loop = await runCompileFixLoop({
    llm: options.llm,
    visualCard,
    shaderPlan,
    references,
    userPrompt,
    initialCode,
    initialRawResponse,
    maxAttempts,
    ...(options.onAttempt ? { onAttempt: options.onAttempt } : {}),
  });

  let screenshots: ScreenshotFrame[] | undefined;
  let visualScore: number | undefined;
  let visualBreakdown: ShaderResult['visualBreakdown'];
  let finalCodeAfterVisual = loop.finalCode;

  if (loop.finalReport.ok && options.screenshot) {
    assertNotAborted(signal);
    emitStep?.({ step: 'screenshot', message: 'Rendering preview frames…' });
    const shot = await renderScreenshots(loop.finalCode, {
      width: options.screenshot.width,
      height: options.screenshot.height,
      times: options.screenshot.times ?? [0.5, 2.0, 4.0],
      spec: visualCard,
    });
    screenshots = shot.frames;
    if (shot.visualScore !== undefined) visualScore = shot.visualScore;
    if (shot.visualBreakdown) visualBreakdown = shot.visualBreakdown;

    // === STRENGTHENED LOOP FOR PERFECT RESULTS ===
    // If visual quality is mediocre after compile success, run one targeted visual polish pass.
    // This uses the deterministic scorer breakdown to guide the Code Agent on weakest areas.
    const PERFECT_THRESHOLD = 78;
    if (
      options.enableVisualPolish &&
      visualScore !== undefined &&
      visualScore < PERFECT_THRESHOLD &&
      options.llm
    ) {
      assertNotAborted(signal);
      emitStep?.({ step: 'visual_polish', message: 'Polishing visual quality…' });
      const weakest = (await import('../tools/candidate-eval')).pickWeakestMetric?.(visualBreakdown || {});
      const polishInput: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        mode: 'fix_user_feedback' as const,
        visualCard,
        shaderPlan,
        references,
        previousCode: finalCodeAfterVisual,
        userPrompt: userPrompt + (weakest ? ` (Focus especially on improving: ${weakest.name} — ${weakest.metric.reason})` : ' Focus on higher contrast, better motion, richer materials, stronger focal point.'),
        userFeedback: weakest 
          ? `The current render scores low on ${weakest.name} (${weakest.metric.reason}). Improve this while preserving exact visual intent from the spec. Make the result more beautiful and impactful.`
          : 'The visual quality can be higher. Increase contrast, material richness, depth, and motion fidelity without changing the core scene/mood/palette.',
      };
      const polish = await runCodePatchAgent(polishInput, options.llm);
      // Quick re-compile check (cheap)
      const recompile = await (await import('../tools/shader-compiler')).compileShader(polish.code);
      if (recompile.ok) {
        finalCodeAfterVisual = polish.code;
        // Re-render for updated score
        const reShot = await renderScreenshots(finalCodeAfterVisual, {
          width: options.screenshot.width,
          height: options.screenshot.height,
          times: options.screenshot.times ?? [0.5, 2.0, 4.0],
          spec: visualCard,
        });
        if (reShot.visualScore !== undefined) visualScore = reShot.visualScore;
        screenshots = reShot.frames;
      }
    }
  }

  const artifact: RunArtifact = {
    id: runId,
    createdAt: Date.now(),
    userPrompt,
    visualCard,
    shaderPlan,
    references,
    compileAttempts: loop.reports,
    finalCode: loop.finalReport.ok ? finalCodeAfterVisual : null,
    attempts: loop.attempts,
    success: loop.finalReport.ok,
    ...(visualScore !== undefined ? { visualScore } : {}),
    ...(screenshots ? { screenshots } : {}),
  };
  runsStore.save(artifact);

  return {
    code: finalCodeAfterVisual,
    source: 'generated',
    attempts: loop.attempts,
    visualCard,
    shaderPlan,
    references,
    compileReport: loop.finalReport,
    ...(visualScore !== undefined ? { visualScore } : {}),
    ...(visualBreakdown ? { visualBreakdown } : {}),
    ...(screenshots ? { screenshots } : {}),
    runId,
    compileAttempts: loop.reports,
  };
}
