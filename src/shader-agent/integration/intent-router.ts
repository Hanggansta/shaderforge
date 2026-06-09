/**
 * Intent router — resolves Auto mode and validates intent prerequisites.
 */

import type { AIIntent } from './types/ai-provider';

export interface IntentRouterInput {
  requested: AIIntent;
  hasCompileErrors: boolean;
  hasSubstantialCode: boolean;
  prompt: string;
}

const EXPLAIN_HINTS = /\b(explain|what does|how does|describe this|walk me through)\b/i;
const OPTIMIZE_HINTS = /\b(optimize|optimise|performance|faster|lighter|reduce cost|less expensive)\b/i;
const MODIFY_HINTS = /\b(change|modify|adjust|tweak|make it|add |remove |more |less |brighter|darker|slower|faster)\b/i;

export function resolveIntent(input: IntentRouterInput): AIIntent {
  const { requested, hasCompileErrors, hasSubstantialCode, prompt } = input;
  if (requested !== 'auto') return requested;

  if (hasCompileErrors) return 'fix';
  if (EXPLAIN_HINTS.test(prompt)) return 'explain';
  if (OPTIMIZE_HINTS.test(prompt)) return 'optimize';
  if (hasSubstantialCode && MODIFY_HINTS.test(prompt)) return 'modify';
  if (hasSubstantialCode && prompt.trim().length > 0 && !/\b(create|generate|new shader|from scratch)\b/i.test(prompt)) {
    return 'modify';
  }
  return 'create';
}

export function intentRequiresCode(intent: AIIntent): boolean {
  return intent === 'modify' || intent === 'fix' || intent === 'explain' || intent === 'optimize';
}

export function intentCountsTowardQuota(intent: AIIntent): boolean {
  return intent !== 'explain';
}