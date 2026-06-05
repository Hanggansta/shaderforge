/**
 * LLMClient — abstract interface for LLM calls.
 *
 * V1 wraps existing providers (Mock / OpenAI-compatible). The default
 * adapter is in `integration/llm-adapters.ts`.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateTextInput {
  system: string;
  user: string;
}

export interface LLMGenerateJsonInput<_T = unknown> {
  system: string;
  user: string;
  schema: unknown;
  model?: string;
}

export interface LLMGenerateJsonOutput<T> {
  value: T | null;
  rawText: string;
  provider: string;
  model?: string;
}

export interface LLMClient {
  generateText(input: LLMGenerateTextInput): Promise<string>;
  generateJson<T>(input: LLMGenerateJsonInput<T>): Promise<LLMGenerateJsonOutput<T>>;
}
