/**
 * ShaderSpec Parser
 * Converts a user prompt into a structured ShaderSpec via LLM.
 * Falls back to a default spec on any failure.
 */

import type { AIProvider } from '../adapter';
import type { ShaderSpec } from './shader-spec';
import { normalizeShaderSpec, createDefaultSpec } from './normalize-shader-spec';

const SPEC_SYSTEM_PROMPT = `You are a shader intent parser. Given a user's natural language description of a visual effect, output a JSON object matching this exact schema. Output ONLY valid JSON, no explanations.

{
  "intent": "create | modify | fix | explain | optimize",
  "scene": {
    "type": "abstract | nebula | ocean | fire | particles | liquid | tunnel | terrain | mandala | unknown",
    "subject": "optional short description of the main visual element",
    "composition": "fullscreen | center_focus | layered | minimal"
  },
  "style": {
    "mood": "dreamy | cyberpunk | minimal | premium | organic | energetic",
    "visualDensity": 0.0 to 1.0,
    "contrast": 0.0 to 1.0,
    "glow": 0.0 to 1.0
  },
  "motion": {
    "type": "flow | pulse | swirl | wave | rotate | drift | static",
    "speed": 0.0 to 1.0,
    "smoothness": 0.0 to 1.0
  },
  "color": {
    "palette": "purple_blue | deep_space | neon_cyber | warm_sunset | gold_white | monochrome | custom",
    "colors": ["optional array of hex color strings if palette is custom"]
  },
  "constraints": {
    "target": "webgl2",
    "performance": "mobile_safe | desktop_balanced | high_quality",
    "maxIterations": 16 to 64,
    "allowRaymarching": true or false,
    "allowTextures": false
  },
  "modification": {
    "currentProblem": "only for fix intent - what is broken",
    "requestedChange": "only for modify intent - what to change",
    "preserve": ["only for modify intent - what to keep"]
  }
}

Rules:
- intent: default "create" unless the user clearly says fix/explain/optimize/modify
- scene.type: infer from keywords (e.g., "fire" -> fire, "space" -> nebula, "water" -> ocean, "spin" -> tunnel, "geometric" -> mandala). Use "abstract" for general artistic requests, "unknown" if unclear
- scene.subject: extract the main visual element the user describes (e.g., "glowing orb", "flowing water", "fractal pattern"). Keep it short (2-5 words). Set to null/omit if not specific
- style.mood: infer from adjectives (e.g., "dark" -> cyberpunk, "calm" -> dreamy, "clean" -> minimal)
- style.visualDensity: 0 = very sparse/minimal, 1 = very dense/busy. Default 0.5
- style.contrast: 0 = low contrast/soft, 1 = high contrast/harsh. Default 0.5
- style.glow: 0 = no glow, 1 = heavy glow/bloom. Default 0.5
- motion.type: infer from verbs (e.g., "flowing" -> flow, "pulsing" -> pulse, "spinning" -> rotate, "still" -> static)
- motion.speed: 0 = very slow, 1 = very fast. Default 0.5
- motion.smoothness: 0 = abrupt/jagged, 1 = very smooth/eased. Default 0.5
- color.palette: infer from color words. Default "purple_blue" for general use
- constraints.performance: "mobile_safe" if user mentions mobile/simple, "high_quality" if detailed/complex, else "desktop_balanced"
- constraints.maxIterations: 32 default, lower for simple shaders, higher for complex raymarching
- constraints.allowRaymarching: true if 3D/raymarching/sphere/ray is mentioned
- modification fields: only fill for modify/fix intents

Output ONLY the JSON object.`;

/**
 * Parse a user prompt into a ShaderSpec via the LLM provider.
 * Falls back to a default spec on any failure.
 */
export async function parseShaderSpec(
  prompt: string,
  provider: AIProvider,
): Promise<ShaderSpec> {
  try {
    const rawJson = await provider.chatCompletion([
      { role: 'system', content: SPEC_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    // Extract JSON from the response (handle markdown fences or raw JSON)
    const jsonStr = extractJson(rawJson);
    if (!jsonStr) {
      return createDefaultSpec();
    }

    const parsed = JSON.parse(jsonStr);
    return normalizeShaderSpec(parsed);
  } catch {
    return createDefaultSpec();
  }
}

/**
 * Extract JSON from a string that may contain markdown fences or prose.
 */
function extractJson(text: string): string | null {
  // Try direct parse first
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  // Try to extract from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Try to find a JSON object in the text
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    return braceMatch[0];
  }

  return null;
}
