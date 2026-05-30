/**
 * Smart Intent Parser
 * Uses the configured LLM to classify user intent from their message.
 * Falls back to safe defaults on failure.
 */

import type { AIProvider, AIIntent } from '../adapter';

export interface IntentDecision {
  intent: AIIntent;
  confidence: number;
  reason: string;
  needsCurrentCode: boolean;
  shouldAskClarifyingQuestion: boolean;
}

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a GLSL shader editor.
Given a user message, classify their intent into exactly one of these categories:

- create: User wants a new shader from scratch. Keywords: "create", "make", "generate", "build", "design", "a shader that..."
- modify: User wants to change the existing shader. Keywords: "make it", "change", "adjust", "modify", "slower", "faster", "brighter", "darker", "more", "less", "add", "remove"
- fix: User wants to fix errors. Keywords: "fix", "error", "broken", "doesn't work", "bug", "crash"
- explain: User wants an explanation. Keywords: "explain", "what does", "how does", "describe", "understand", "what is"
- optimize: User wants performance improvement. Keywords: "optimize", "performance", "faster rendering", "efficient", "reduce loops"

Respond with ONLY a JSON object (no markdown, no code blocks):
{"intent":"<category>","confidence":<0.0-1.0>,"reason":"<brief explanation>"}

Rules:
- If the message is ambiguous, prefer "create" for new descriptions and "modify" for changes to existing code
- Confidence should reflect how clear the intent is (1.0 = very clear, 0.5 = ambiguous)
- If the message is very short or unclear, use lower confidence`;

const INTENT_MAP: Record<string, AIIntent> = {
  create: 'create',
  modify: 'modify',
  fix: 'fix',
  explain: 'explain',
  optimize: 'optimize',
};

const NEEDS_CODE: AIIntent[] = ['modify', 'fix', 'explain', 'optimize'];

/**
 * Parse user intent using the configured LLM provider.
 * Falls back to safe defaults on failure.
 */
export async function parseIntent(
  prompt: string,
  provider: AIProvider,
  context: { hasCode: boolean }
): Promise<IntentDecision> {
  try {
    const userMessage = context.hasCode
      ? `User has shader code in the editor.\nMessage: "${prompt}"`
      : `User has no shader code (using default).\nMessage: "${prompt}"`;

    const response = await provider.chatCompletion([
      { role: 'system', content: INTENT_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]);

    const parsed = parseIntentResponse(response);
    if (parsed) {
      let intent = INTENT_MAP[parsed.intent] || fallbackIntent(context.hasCode);
      const confidence = Math.max(0, Math.min(1, parsed.confidence));
      // Safety: if no code exists and intent needs code, force to create
      if (!context.hasCode && NEEDS_CODE.includes(intent)) {
        intent = 'create';
      }
      return {
        intent,
        confidence,
        reason: parsed.reason,
        needsCurrentCode: NEEDS_CODE.includes(intent),
        shouldAskClarifyingQuestion: confidence < 0.5,
      };
    }
  } catch {
    // Fall through to default
  }

  // Fallback on any failure
  const intent = fallbackIntent(context.hasCode);
  return {
    intent,
    confidence: 0.3,
    reason: 'Could not determine intent, using default.',
    needsCurrentCode: NEEDS_CODE.includes(intent),
    shouldAskClarifyingQuestion: false, // fallback is safe (create or modify)
  };
}

function fallbackIntent(hasCode: boolean): AIIntent {
  return hasCode ? 'modify' : 'create';
}

function parseIntentResponse(response: string): { intent: string; confidence: number; reason: string } | null {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(response.trim());
    if (parsed.intent && typeof parsed.confidence === 'number') {
      return parsed;
    }
  } catch {
    // Try extracting JSON from response
    const match = response.match(/\{[^}]*"intent"\s*:\s*"[^"]*"[^}]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.intent && typeof parsed.confidence === 'number') {
          return parsed;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}
