/**
 * AIProvider — the provider interface exposed to UI and ShaderAgentService.
 *
 * V1 keeps the existing surface so Settings + AIChatPanel can configure
 * providers without learning a new shape. The internal ShaderAgentService
 * wraps the provider into an LLMClient (see ./llm-adapters.ts).
 */

export type AIIntent = 'auto' | 'create' | 'modify' | 'fix' | 'explain' | 'optimize';

export interface ShaderContext {
  currentCode?: string;
  errorOutput?: string;
  supportedUniforms?: string[];
  intent?: AIIntent;
}

export interface AIResponse {
  code?: string;
  explanation?: string;
  warnings?: string[];
  rawResponse?: string;
  providerName?: string;
  model?: string;
}

export interface ShaderCandidate {
  id: string;
  code: string;
  source: 'generated' | 'repaired' | 'fallback';
  compileStatus: 'pending' | 'success' | 'failed';
  score: number;
  attempts: number;
  errors?: string[];
  visualScore?: number;
  visualBreakdown?: Record<string, { score: number; reason: string }>;
}

export interface AIProvider {
  name: string;
  isConfigured: () => boolean;
  configure: (config: Record<string, string>) => void;

  generateShader: (prompt: string, context?: ShaderContext) => Promise<AIResponse>;
  modifyShader: (prompt: string, currentCode: string, context?: ShaderContext) => Promise<AIResponse>;
  fixShader: (currentCode: string, errorOutput: string, context?: ShaderContext) => Promise<AIResponse>;
  explainShader: (currentCode: string, context?: ShaderContext) => Promise<AIResponse>;
  chatCompletion: (messages: Array<{ role: string; content: string }>) => Promise<string>;

  /**
   * Generate shader from structured messages. The provider passes messages
   * directly to the LLM without constructing its own system prompt layer.
   */
  generateWithMessages?: (messages: Array<{ role: string; content: string }>) => Promise<AIResponse>;

  /**
   * Fix shader from structured messages. Same contract as
   * `generateWithMessages` but for the fix flow.
   */
  fixWithMessages?: (currentCode: string, messages: Array<{ role: string; content: string }>) => Promise<AIResponse>;

  /**
   * Generate multiple shader candidates in a single API call.
   */
  generateCandidates?: (messages: Array<{ role: string; content: string }>, n: number) => Promise<AIResponse[]>;
}
