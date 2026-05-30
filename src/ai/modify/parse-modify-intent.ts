import type { AIProvider } from '../adapter';
import type { ModifyIntent, ModifyOperation } from './modify-intent';

interface ParseContext {
  currentCode?: string;
  spec?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  goldenExamples?: string[];
}

interface RawModifyIntent {
  language?: string;
  operations?: Array<{
    target?: string;
    action?: string;
    value?: string;
    strength?: number;
  }>;
  preserveCurrentStructure?: boolean;
  requiresFullRewrite?: boolean;
  confidence?: number;
  summary?: string;
  preserve?: string[];
  avoid?: string[];
}

export async function parse_modify_intent(
  prompt: string,
  provider: AIProvider,
  context?: ParseContext
): Promise<ModifyIntent> {
  const systemMessage = `You are a shader modification intent parser. Given a user's modification request, extract the structured intent.

Output JSON with this exact structure:
{
  "language": "en|zh|mixed|unknown",
  "operations": [
    {
      "target": "motion_speed|color|brightness|contrast|density|glow|noise|composition|style|scene|effect|interaction|unknown",
      "action": "increase|decrease|set|add|remove|replace|unknown",
      "value": "optional value description",
      "strength": 0.0-1.0
    }
  ],
  "preserveCurrentStructure": true/false,
  "requiresFullRewrite": true/false,
  "confidence": 0.0-1.0,
  "summary": "brief description of what user wants",
  "preserve": ["list of things to preserve"],
  "avoid": ["list of things to avoid"]
}

Rules:
- Detect language: "en" for English, "zh" for Chinese, "mixed" for both
- For speed/brightness/contrast: "slower"/"slower"=decrease, "faster"/"brighter"=increase
- For color: "more blue"=increase blue, "less red"=decrease red
- preserveCurrentStructure: true unless user explicitly wants complete rewrite
- requiresFullRewrite: true only for "completely change", "make it entirely different"
- confidence: 0.8+ for clear intent, 0.5-0.8 for ambiguous, <0.5 for unclear
- Extract preserve/avoid from context if available
- Output ONLY valid JSON`;

  let contextInfo = '';
  if (context?.currentCode) {
    contextInfo += `\nCurrent shader code (first 500 chars):\n${context.currentCode.substring(0, 500)}`;
  }
  if (context?.spec) {
    contextInfo += `\nShaderSpec: ${JSON.stringify(context.spec, null, 2)}`;
  }
  if (context?.plan) {
    contextInfo += `\nTechniquePlan: ${JSON.stringify(context.plan, null, 2)}`;
  }
  if (context?.goldenExamples?.length) {
    contextInfo += `\nGolden examples: ${context.goldenExamples.join(', ')}`;
  }

  const userMessage = `Parse this modification intent:
"${prompt}"
${contextInfo}

Output ONLY the JSON object.`;

  try {
    const response = await provider.chatCompletion([
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ]);

    const parsed = JSON.parse(response);
    return normalize_modify_intent(parsed);
  } catch (error) {
    console.warn('Failed to parse modify intent, using conservative defaults:', error);
    return get_conservative_defaults(prompt);
  }
}

function normalize_modify_intent(raw: RawModifyIntent): ModifyIntent {
  const language = ['en', 'zh', 'mixed', 'unknown'].includes(raw.language ?? '') ? raw.language as ModifyIntent['language'] : 'unknown';

  const operations: ModifyOperation[] = Array.isArray(raw.operations)
    ? raw.operations.map((op) => ({
        target: [
          'motion_speed', 'color', 'brightness', 'contrast', 'density',
          'glow', 'noise', 'composition', 'style', 'scene', 'effect',
          'interaction', 'unknown'
        ].includes(op.target ?? '') ? op.target as ModifyOperation['target'] : 'unknown',
        action: ['increase', 'decrease', 'set', 'add', 'remove', 'replace', 'unknown'].includes(op.action ?? '')
          ? op.action as ModifyOperation['action'] : 'unknown',
        value: typeof op.value === 'string' ? op.value : undefined,
        strength: typeof op.strength === 'number' ? Math.max(0, Math.min(1, op.strength)) : 0.5,
      }))
    : [{ target: 'unknown' as const, action: 'unknown' as const, strength: 0.5 }];

  const preserveCurrentStructure = typeof raw.preserveCurrentStructure === 'boolean'
    ? raw.preserveCurrentStructure : true;

  const requiresFullRewrite = typeof raw.requiresFullRewrite === 'boolean'
    ? raw.requiresFullRewrite : false;

  const confidence = typeof raw.confidence === 'number'
    ? Math.max(0, Math.min(1, raw.confidence)) : 0.5;

  const summary = typeof raw.summary === 'string' ? raw.summary : '';

  const preserve = Array.isArray(raw.preserve)
    ? raw.preserve.filter((s): s is string => typeof s === 'string')
    : [];

  const avoid = Array.isArray(raw.avoid)
    ? raw.avoid.filter((s): s is string => typeof s === 'string')
    : [];

  return {
    language,
    operations,
    preserveCurrentStructure,
    requiresFullRewrite,
    confidence,
    summary,
    preserve,
    avoid,
  };
}

function get_conservative_defaults(prompt: string): ModifyIntent {
  const isChinese = /[一-鿿]/.test(prompt);

  return {
    language: isChinese ? 'zh' : 'unknown',
    operations: [
      {
        target: 'unknown',
        action: 'unknown',
        strength: 0.3,
      }
    ],
    preserveCurrentStructure: true,
    requiresFullRewrite: false,
    confidence: 0,
    summary: 'Unable to parse intent clearly',
    preserve: [],
    avoid: [],
  };
}
