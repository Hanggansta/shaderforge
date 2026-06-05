/**
 * Shader Agent Service — public entry point for the Shader Agent Harness.
 *
 * App.tsx imports THIS (instead of `src/ai/service.ts`) to drive the new pipeline.
 *
 * V1: Browser-only, reuses the existing provider infrastructure.
 * V2: Replace LLMClient with a server-backed implementation; replace
 *     runsStore with a filesystem-backed store; replace renderScreenshots
 *     with Playwright.
 */

import type { AIProvider, AIIntent, ShaderCandidate } from './types/ai-provider';
import { MockAIProvider } from './providers/mock';
import { createLLMClient, type LLMClient } from './llm-adapters';
import { generateShader, type GenerateOptions, type GenerateResult } from '../workflows/generate-shader';
import { patchShader, type PatchOptions, type PatchResult } from '../workflows/patch-shader';
import { runsStore, type RunArtifact } from '../runs/runs';
import { adaptGenerateResult, adaptPatchResult } from './agent-result-adapter';
import type { AgentResult, AgentProgress } from './agent-result-types';
import type { VisualCard } from '../schemas/visual-card';

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

  async generate(
    userPrompt: string,
    options?: Partial<GenerateOptions> & { onProgress?: (p: AgentProgress) => void }
  ): Promise<GenerateResult> {
    const { onProgress, ...rest } = options ?? {};
    if (onProgress) {
      onProgress({ status: 'generating', attempt: 0, maxAttempts: rest.maxAttempts ?? 3, message: 'Starting shader generation…' });
    }
    const result = await generateShader(userPrompt, {
      llm: this.llm,
      provider: this.provider,
      maxAttempts: rest.maxAttempts ?? 3,
      ...rest,
    });
    if (onProgress) {
      onProgress({
        status: result.compileReport.ok ? 'success' : 'failed',
        attempt: result.attempts,
        maxAttempts: result.attempts,
        message: result.compileReport.ok ? 'Shader compiled' : 'Compile failed',
      });
    }
    return result;
  }

  async patch(
    previousCode: string,
    userFeedback: string,
    visualCard: GenerateResult['visualCard'],
    options?: Partial<PatchOptions>
  ): Promise<PatchResult> {
    return patchShader(previousCode, userFeedback, visualCard, {
      llm: this.llm,
      provider: this.provider,
      maxAttempts: options?.maxAttempts ?? 3,
      ...options,
    });
  }

  getRuns(): RunArtifact[] {
    return runsStore.list();
  }

  getRun(id: string): RunArtifact | null {
    return runsStore.get(id);
  }

  async generateAsAgentResult(
    userPrompt: string,
    options?: { maxAttempts?: number; onProgress?: (p: AgentProgress) => void }
  ): Promise<AgentResult> {
    const { onProgress, ...rest } = options ?? {};
    onProgress?.({ status: 'generating', attempt: 0, maxAttempts: rest.maxAttempts ?? 3, message: 'Starting shader generation…' });
    const result = await this.generate(userPrompt, rest);
    onProgress?.({ status: 'success', attempt: result.attempts, maxAttempts: result.attempts, message: 'Done' });
    return adaptGenerateResult(result);
  }

  async patchAsAgentResult(
    previousCode: string,
    userFeedback: string,
    visualCard: VisualCard,
    options?: { maxAttempts?: number }
  ): Promise<AgentResult> {
    const result = await this.patch(previousCode, userFeedback, visualCard, options);
    return adaptPatchResult(result);
  }
}

export const shaderAgent = new ShaderAgentService();
export type { GenerateResult, PatchResult };
export type { RunArtifact };
export type { AIIntent, ShaderCandidate };
