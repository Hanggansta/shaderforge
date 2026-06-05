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
import { selectReferences } from '../tools/reference-selector';
import { runCompileFixLoop } from './compile-fix-loop';
import { renderScreenshots } from '../tools/screenshot-renderer';
import { runsStore, type RunArtifact } from '../runs/runs';

export interface GenerateOptions {
  llm: LLMClient | null;
  provider: AIProvider | null;
  maxAttempts?: number;
  screenshot?: { width: number; height: number; times?: number[] };
  runId?: string;
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

  const visualCard: VisualCard = await runVisualStructurer(
    { userPrompt },
    options.llm,
    options.provider
  );

  const shaderPlan: ShaderPlan = runShaderPlanner({ visualCard });

  const { cards: references } = selectReferences(visualCard, shaderPlan);

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

  const loop = await runCompileFixLoop({
    llm: options.llm,
    visualCard,
    shaderPlan,
    references,
    userPrompt,
    initialCode: firstPass.code,
    initialRawResponse: firstPass.rawResponse,
    maxAttempts,
  });

  let screenshots: ScreenshotFrame[] | undefined;
  let visualScore: number | undefined;
  let visualBreakdown: ShaderResult['visualBreakdown'];
  if (loop.finalReport.ok && options.screenshot) {
    const shot = await renderScreenshots(loop.finalCode, {
      width: options.screenshot.width,
      height: options.screenshot.height,
      times: options.screenshot.times ?? [0.5, 2.0, 4.0],
      spec: visualCard,
    });
    screenshots = shot.frames;
    if (shot.visualScore !== undefined) visualScore = shot.visualScore;
    if (shot.visualBreakdown) visualBreakdown = shot.visualBreakdown;
  }

  const artifact: RunArtifact = {
    id: runId,
    createdAt: Date.now(),
    userPrompt,
    visualCard,
    shaderPlan,
    references,
    compileAttempts: loop.reports,
    finalCode: loop.finalReport.ok ? loop.finalCode : null,
    attempts: loop.attempts,
    success: loop.finalReport.ok,
    ...(visualScore !== undefined ? { visualScore } : {}),
    ...(screenshots ? { screenshots } : {}),
  };
  runsStore.save(artifact);

  return {
    code: loop.finalCode,
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
