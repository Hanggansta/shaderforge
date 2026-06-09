/**
 * Shader Agent Service — public entry point for the Shader Agent Harness.
 */

import type { AIProvider, AIIntent } from './types/ai-provider';
import { MockAIProvider } from './providers/mock';
import { createLLMClient, type LLMClient } from './llm-adapters';
import { generateShader, type GenerateOptions, type GenerateResult } from '../workflows/generate-shader';
import { patchShader, type PatchOptions, type PatchResult } from '../workflows/patch-shader';
import type { CompileAttemptEvent } from '../workflows/compile-fix-loop';
import { runsStore, type RunArtifact } from '../runs/runs';
import { adaptGenerateResult, adaptPatchResult } from './agent-result-adapter';
import type { AgentResult, AgentProgress } from './agent-result-types';
import type { VisualCard } from '../schemas/visual-card';
import { selectBestCandidate } from '../tools/candidate-selector';
import {
  resolveIntent,
  intentRequiresCode,
  intentCountsTowardQuota,
  type IntentRouterInput,
} from './intent-router';
import { fallbackVisualCard } from './result-metadata';
import {
  assertNotAborted,
  WORKFLOW_STEP_LABELS,
  type WorkflowStepEvent,
  type WorkflowStepId,
} from './workflow-progress';

export interface RunIntentContext {
  currentCode: string;
  compileErrorLog?: string;
  visualCard: VisualCard | null;
  hasSubstantialCode: boolean;
}

export interface RunIntentOptions {
  maxAttempts?: number;
  candidateCount?: number;
  enableVisualPolish?: boolean;
  onProgress?: (p: AgentProgress) => void;
}

function stepStatus(step: WorkflowStepId): AgentProgress['status'] {
  if (step === 'compiling' || step === 'screenshot') return 'compiling';
  if (step === 'fixing') return 'fixing';
  if (step === 'visual_polish' || step === 'candidate_rerank') return 'generating';
  return 'generating';
}

function emitWorkflowProgress(
  onProgress: ((p: AgentProgress) => void) | undefined,
  event: WorkflowStepEvent,
  maxAttempts: number,
): void {
  if (!onProgress) return;
  onProgress({
    status: stepStatus(event.step),
    attempt: 0,
    maxAttempts,
    message: WORKFLOW_STEP_LABELS[event.step] ?? event.message,
    details: event.details ?? event.message,
    pipelineStep: event.step,
  });
}

function emitCompileProgress(
  onProgress: ((p: AgentProgress) => void) | undefined,
  event: CompileAttemptEvent,
): void {
  if (!onProgress) return;
  const message =
    event.status === 'compiling'
      ? `Compiling ${event.attempt}/${event.maxAttempts}…`
      : event.status === 'fixing'
        ? `Fix errors (${event.attempt}/${event.maxAttempts})…`
        : event.status === 'success'
          ? 'Compiled'
          : `Failed after ${event.attempt}/${event.maxAttempts} attempts`;
  onProgress({
    status: event.status,
    attempt: event.attempt,
    maxAttempts: event.maxAttempts,
    message,
    pipelineStep: event.status === 'fixing' ? 'fixing' : 'compiling',
    ...(event.errorSummary ? { details: event.errorSummary } : {}),
  });
}

export class ShaderAgentService {
  private provider: AIProvider;
  private llm: LLMClient | null;
  private abortController: AbortController | null = null;

  constructor(provider?: AIProvider) {
    this.provider = provider || new MockAIProvider();
    this.llm = createLLMClient(this.provider);
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
    this.llm = createLLMClient(this.provider);
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private beginRequest(): AbortSignal {
    this.cancel();
    this.abortController = new AbortController();
    return this.abortController.signal;
  }

  private endRequest(): void {
    this.abortController = null;
  }

  async generate(
    userPrompt: string,
    options?: Partial<GenerateOptions> & { onProgress?: (p: AgentProgress) => void; candidateCount?: number }
  ): Promise<GenerateResult> {
    const { onProgress, candidateCount = 1, ...rest } = options ?? {};
    const maxAttempts = rest.maxAttempts ?? 3;
    const signal = rest.signal ?? this.beginRequest();

    try {
      if (onProgress) {
        onProgress({ status: 'generating', attempt: 0, maxAttempts, message: 'Starting shader generation…' });
      }

      const workflowHooks = {
        signal,
        enableVisualPolish: rest.enableVisualPolish ?? false,
        onWorkflowStep: (event: WorkflowStepEvent) => emitWorkflowProgress(onProgress, event, maxAttempts),
        onAttempt: (event: CompileAttemptEvent) => emitCompileProgress(onProgress, event),
      };

      if (candidateCount > 1 && this.provider) {
        onProgress?.({
          status: 'generating',
          attempt: 0,
          maxAttempts,
          message: `Generating ${candidateCount} candidates…`,
          pipelineStep: 'candidate_rerank',
        });

        try {
          let rawCandidates: Array<{ code: string; rawResponse?: string }> = [];
          const messages = [
            { role: 'system', content: 'You are an expert GLSL shader engineer for Shadertoy. Output ONLY valid, compilable code starting with "precision mediump float;" and a correct mainImage function.' },
            { role: 'user', content: `Create a high-quality, visually interesting GLSL shader for this description: "${userPrompt}". Make it compile on first try if possible.` },
          ];

          const providerAny = this.provider as unknown as Record<string, unknown>;
          if (typeof providerAny.generateCandidates === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const multi = await (providerAny.generateCandidates as (msgs: any, n: number) => Promise<any[]>)(messages, candidateCount);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rawCandidates = multi.map((m: any) => ({ code: m.code || m.rawResponse || '', rawResponse: m.rawResponse }));
          } else {
            for (let i = 0; i < candidateCount; i++) {
              assertNotAborted(signal);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const chatFn = providerAny.chatCompletion as ((m: any) => Promise<any>) | undefined;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const genFn = providerAny.generateShader as ((p: string) => Promise<any>) | undefined;
              const resp = (chatFn ? await chatFn(messages) : null) || (genFn ? await genFn(userPrompt) : null);
              rawCandidates.push({ code: (resp?.code || resp || '').toString() });
            }
          }

          const { runVisualStructurer } = await import('../agents/visual-structurer');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const visualCard = await runVisualStructurer({ userPrompt }, this.llm, this.provider as any);
          const best = await selectBestCandidate(rawCandidates, visualCard);

          if (best?.code) {
            onProgress?.({
              status: 'generating',
              attempt: 0,
              maxAttempts,
              message: `Best candidate: visual score ${best.visualScore.toFixed(0)}`,
              pipelineStep: 'candidate_rerank',
            });

            const result = await generateShader(userPrompt, {
              llm: this.llm,
              provider: this.provider,
              maxAttempts,
              initialCode: best.code,
              initialRawResponse: rawCandidates[best.sourceIndex]?.rawResponse ?? '',
              ...workflowHooks,
              ...rest,
              signal,
            });

            if (result.compileReport.ok && result.visualScore !== undefined) {
              result.visualScore = Math.max(result.visualScore, best.visualScore);
            }

            onProgress?.({
              status: result.compileReport.ok ? 'success' : 'failed',
              attempt: result.attempts,
              maxAttempts: result.attempts,
              message: result.compileReport.ok ? 'Shader compiled' : 'Compile failed',
            });
            return result;
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') throw err;
          if (import.meta.env.DEV) console.debug('[ShaderAgent] Candidate rerank failed, falling back', err);
        }
      }

      const result = await generateShader(userPrompt, {
        llm: this.llm,
        provider: this.provider,
        maxAttempts,
        ...workflowHooks,
        ...rest,
        signal,
      });

      onProgress?.({
        status: result.compileReport.ok ? 'success' : 'failed',
        attempt: result.attempts,
        maxAttempts: result.attempts,
        message: result.compileReport.ok ? 'Shader compiled' : 'Compile failed',
      });
      return result;
    } finally {
      if (!rest.signal) this.endRequest();
    }
  }

  async patch(
    previousCode: string,
    userFeedback: string,
    visualCard: VisualCard,
    options?: Partial<PatchOptions> & { onProgress?: (p: AgentProgress) => void }
  ): Promise<PatchResult> {
    const { onProgress, ...rest } = options ?? {};
    const maxAttempts = rest.maxAttempts ?? 3;
    const signal = rest.signal ?? this.beginRequest();

    try {
      onProgress?.({ status: 'generating', attempt: 0, maxAttempts, message: 'Starting patch…' });

      const result = await patchShader(previousCode, userFeedback, visualCard, {
        llm: this.llm,
        provider: this.provider,
        maxAttempts,
        signal,
        onWorkflowStep: (event) => emitWorkflowProgress(onProgress, event, maxAttempts),
        onAttempt: (event) => emitCompileProgress(onProgress, event),
        ...rest,
      });

      onProgress?.({
        status: result.compileReport.ok ? 'success' : 'failed',
        attempt: result.attempts,
        maxAttempts: result.attempts,
        message: result.compileReport.ok ? 'Patch compiled' : 'Patch failed',
      });
      return result;
    } finally {
      if (!rest.signal) this.endRequest();
    }
  }

  async runIntent(
    prompt: string,
    requestedIntent: AIIntent,
    context: RunIntentContext,
    options?: RunIntentOptions,
  ): Promise<AgentResult> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const candidateCount = options?.candidateCount ?? 1;
    const onProgress = options?.onProgress;
    const hasCompileErrors = Boolean(context.compileErrorLog?.trim());

    const resolved = resolveIntent({
      requested: requestedIntent,
      hasCompileErrors,
      hasSubstantialCode: context.hasSubstantialCode,
      prompt,
    } satisfies IntentRouterInput);

    if (intentRequiresCode(resolved) && !context.hasSubstantialCode) {
      return {
        code: context.currentCode,
        success: false,
        attempts: 0,
        progress: [],
        detectedIntent: resolved,
        clarification: 'Load or write shader code in the editor before using modify, fix, explain, or optimize.',
      };
    }

    if (resolved === 'explain') {
      onProgress?.({ status: 'generating', attempt: 0, maxAttempts: 1, message: 'Explaining shader…' });
      const resp = await this.provider.explainShader(context.currentCode);
      onProgress?.({ status: 'success', attempt: 1, maxAttempts: 1, message: 'Done' });
      return {
        code: context.currentCode,
        success: true,
        attempts: 0,
        progress: [],
        explanation: resp.explanation ?? 'No explanation returned.',
        detectedIntent: 'explain',
      };
    }

    const visualCard = context.visualCard ?? fallbackVisualCard(prompt);

    if (resolved === 'modify' || resolved === 'optimize' || resolved === 'fix') {
      const feedback =
        resolved === 'fix' && context.compileErrorLog
          ? `Fix these compile errors:\n${context.compileErrorLog}\n\nUser note: ${prompt}`
          : resolved === 'optimize'
            ? `Optimize for WebGL2 performance without changing the visual intent. Reduce expensive loops and nested noise. ${prompt}`
            : prompt;

      const patchResult = await this.patch(context.currentCode, feedback, visualCard, {
        maxAttempts,
        onProgress,
      });

      return adaptPatchResult(patchResult, { detectedIntent: resolved, intent: resolved });
    }

    const genResult = await this.generate(prompt, {
      maxAttempts,
      candidateCount,
      enableVisualPolish: options?.enableVisualPolish ?? false,
      onProgress,
      screenshot: { width: 256, height: 256 },
    });

    return adaptGenerateResult(genResult, {
      detectedIntent: resolved === 'auto' ? 'create' : resolved,
      intent: resolved,
      candidateCount,
    });
  }

  /** @deprecated Prefer runIntent — kept for direct generate calls */
  async generateAsAgentResult(
    userPrompt: string,
    options?: RunIntentOptions,
  ): Promise<AgentResult> {
    const result = await this.generate(userPrompt, {
      maxAttempts: options?.maxAttempts,
      candidateCount: options?.candidateCount,
      enableVisualPolish: options?.enableVisualPolish,
      onProgress: options?.onProgress,
      screenshot: { width: 256, height: 256 },
    });
    return adaptGenerateResult(result, { candidateCount: options?.candidateCount });
  }

  async patchAsAgentResult(
    previousCode: string,
    userFeedback: string,
    visualCard: VisualCard,
    options?: { maxAttempts?: number; onProgress?: (p: AgentProgress) => void },
  ): Promise<AgentResult> {
    const result = await this.patch(previousCode, userFeedback, visualCard, options);
    return adaptPatchResult(result);
  }

  getRuns(): RunArtifact[] {
    return runsStore.list();
  }

  getRun(id: string): RunArtifact | null {
    return runsStore.get(id);
  }
}

export { intentCountsTowardQuota };
export const shaderAgent = new ShaderAgentService();
export type { GenerateResult, PatchResult };
export type { RunArtifact };
export type { AIIntent };