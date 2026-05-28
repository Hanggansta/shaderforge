/**
 * AI Service
 * Main interface for AI shader generation.
 * Uses the agent loop for reliable code generation.
 */

import type { AIProvider, AIIntent } from './adapter';
import { agentLoop, type AgentResult, type AgentProgress, type CompileResult } from './agent-loop';
import { MockAIProvider } from './providers/mock';

export type { AgentResult, AgentProgress, CompileResult };

export class AIService {
  private provider: AIProvider;
  private abortController: AbortController | null = null;

  constructor(provider?: AIProvider) {
    this.provider = provider || new MockAIProvider();
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
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

  /**
   * Generate a shader using the agent loop
   */
  async generate(
    prompt: string,
    intent: AIIntent,
    options: {
      compileFn?: (code: string) => Promise<CompileResult>;
      onProgress?: (progress: AgentProgress) => void;
      maxAttempts?: number;
    } = {}
  ): Promise<AgentResult> {
    this.cancel();
    this.abortController = new AbortController();

    const { compileFn, onProgress, maxAttempts = 3 } = options;

    try {
      // Build the full prompt based on intent
      let fullPrompt = prompt;

      switch (intent) {
        case 'create':
          fullPrompt = `Create a new shader: ${prompt}`;
          break;
        case 'modify':
          fullPrompt = `Modify the current shader: ${prompt}`;
          break;
        case 'fix':
          fullPrompt = `Fix the shader errors: ${prompt}`;
          break;
        case 'explain':
          // For explain, we don't need the agent loop
          const explanation = await this.provider.explainShader(prompt);
          return {
            code: '',
            success: true,
            attempts: 1,
            progress: [{
              status: 'success',
              attempt: 1,
              maxAttempts: 1,
              message: explanation.explanation || 'Explanation generated',
            }],
          };
        case 'optimize':
          fullPrompt = `Optimize this shader for better performance: ${prompt}`;
          break;
      }

      // Run the agent loop
      const result = await agentLoop(this.provider, fullPrompt, {
        compileFn,
        onProgress,
        maxAttempts,
      });

      return result;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          code: '',
          success: false,
          attempts: 0,
          progress: [{
            status: 'failed',
            attempt: 0,
            maxAttempts,
            message: 'Request cancelled',
          }],
        };
      }

      throw error;
    }
  }

  /**
   * Fix code with compilation errors (convenience method)
   */
  async fixCode(
    code: string,
    errors: string[],
    options: {
      compileFn?: (code: string) => Promise<CompileResult>;
      onProgress?: (progress: AgentProgress) => void;
      maxAttempts?: number;
    } = {}
  ): Promise<AgentResult> {
    return this.generate(
      `Fix the compilation errors:\n${errors.join('\n')}\n\nCurrent code:\n${code}`,
      'fix',
      options
    );
  }
}

// Singleton instance
export const aiService = new AIService();
