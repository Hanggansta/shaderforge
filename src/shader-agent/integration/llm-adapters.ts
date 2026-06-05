/**
 * LLMClient adapters — wire LLMClient to internal providers.
 */

import type {
  AIProvider, AIResponse, ShaderCandidate,
} from './types/ai-provider';
import type {
  LLMClient, LLMMessage, LLMGenerateTextInput, LLMGenerateJsonInput, LLMGenerateJsonOutput,
} from '../llm-client';
export type { LLMClient } from '../llm-client';

export function createLLMClient(provider?: AIProvider): LLMClient | null {
  if (!provider) return null;
  return new ProviderLLMClient(provider);
}

class ProviderLLMClient implements LLMClient {
  private readonly provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async generateText(input: LLMGenerateTextInput): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ];
    return this.callChatCompletion(messages);
  }

  async generateJson<T>(input: LLMGenerateJsonInput<T>): Promise<LLMGenerateJsonOutput<T>> {
    const messages: LLMMessage[] = [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ];
    const rawText = await this.callChatCompletion(messages);
    return {
      value: tryParseJson<T>(rawText),
      rawText,
      provider: this.provider.name,
    };
  }

  private async callChatCompletion(messages: LLMMessage[]): Promise<string> {
    const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
    if (this.provider.generateWithMessages) {
      const resp = await this.provider.generateWithMessages(apiMessages);
      return extractText(resp);
    }
    if (this.provider.chatCompletion) {
      return await this.provider.chatCompletion(apiMessages);
    }
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const user = messages.find((m) => m.role === 'user')?.content ?? '';
    const resp = await this.provider.generateShader(`${system}\n\n${user}`);
    return extractText(resp);
  }
}

function extractText(resp: AIResponse | string | undefined | null): string {
  if (resp == null) return '';
  if (typeof resp === 'string') return resp;
  if (resp.code) return resp.code;
  if (resp.explanation) return resp.explanation;
  if (resp.rawResponse) return resp.rawResponse;
  return '';
}

export function tryParseJson<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : cleaned;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch {
    return null;
  }
}

/** Convenience: re-export ShaderCandidate from internal types. */
export type { AIProvider, ShaderCandidate };
