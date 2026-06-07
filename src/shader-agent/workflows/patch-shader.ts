/**
 * Patch Workflow — apply a local fix to an existing shader based on user
 * feedback or compile errors.
 */

import type { LLMClient } from '../llm-client';
import type { AIProvider } from '../integration/types/ai-provider';
import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import type { ShaderResult } from '../schemas/shader-result';
import { runShaderPlanner } from '../agents/shader-planner';
import { runCodePatchAgent } from '../agents/code-patch-agent';
import { selectReferences } from '../tools/reference-selector';
import { runCompileFixLoop, type CompileAttemptEvent } from './compile-fix-loop';
import { runsStore, type RunArtifact } from '../runs/runs';

export interface PatchOptions {
  llm: LLMClient | null;
  provider: AIProvider | null;
  maxAttempts?: number;
  runId?: string;
  /** Per-attempt observer forwarded to the compile-fix loop. */
  onAttempt?: (event: CompileAttemptEvent) => void;
}

export interface PatchResult extends ShaderResult {
  runId: string;
  compileAttempts: ShaderResult['compileReport'][];
}

export async function patchShader(
  previousCode: string,
  userFeedback: string,
  visualCard: VisualCard,
  options: PatchOptions
): Promise<PatchResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const runId = options.runId ?? `patch-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;

  const shaderPlan: ShaderPlan = runShaderPlanner({ visualCard });
  const { cards: references } = selectReferences(visualCard, shaderPlan);

  const patched = await runCodePatchAgent(
    {
      mode: 'fix_user_feedback',
      visualCard,
      shaderPlan,
      references,
      previousCode,
      userFeedback,
      userPrompt: userFeedback,
    },
    options.llm
  );

  const loop = await runCompileFixLoop({
    llm: options.llm,
    visualCard,
    shaderPlan,
    references,
    userPrompt: userFeedback,
    initialCode: patched.code,
    initialRawResponse: patched.rawResponse,
    maxAttempts,
    ...(options.onAttempt ? { onAttempt: options.onAttempt } : {}),
  });

  const artifact: RunArtifact = {
    id: runId,
    createdAt: Date.now(),
    userPrompt: userFeedback,
    visualCard,
    shaderPlan,
    references,
    compileAttempts: loop.reports,
    finalCode: loop.finalReport.ok ? loop.finalCode : null,
    attempts: loop.attempts,
    success: loop.finalReport.ok,
  };
  runsStore.save(artifact);

  return {
    code: loop.finalCode,
    source: 'patched',
    attempts: loop.attempts,
    visualCard,
    shaderPlan,
    references,
    compileReport: loop.finalReport,
    runId,
    compileAttempts: loop.reports,
  };
}
