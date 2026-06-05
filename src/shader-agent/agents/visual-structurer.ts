/**
 * Agent 1 — Visual Structurer
 *
 * Converts a free-form user prompt into a structured VisualCard (= ShaderSpec).
 *
 * In V1 the agent routes through `parseShaderSpec` (LLM path when configured,
 * otherwise keyword inference). The LLM is informed by the same system prompt
 * the keyword fallback would use; results are normalized through
 * `normalizeShaderSpec` to guarantee the shape.
 */

import type { LLMClient } from '../llm-client';
import type { VisualCard } from '../schemas/visual-card';
import { parseShaderSpec, parseShaderSpecWithLLM } from './parse-shader-spec';
import type { AIProvider } from '../integration/types/ai-provider';

export interface VisualStructurerInput {
  userPrompt: string;
  currentCode?: string;
}

export async function runVisualStructurer(
  input: VisualStructurerInput,
  llm: LLMClient | null,
  provider: AIProvider | null
): Promise<VisualCard> {
  if (!llm || !provider) {
    return parseShaderSpec(input.userPrompt, null);
  }
  return parseShaderSpecWithLLM(input.userPrompt, provider);
}
