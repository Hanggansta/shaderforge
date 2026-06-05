/**
 * ShaderSpec Parser
 * V1: Routes to default spec (intelligent keyword inference in normalize).
 *      LLM path is optional — call parseShaderSpecWithLLM when provider is ready.
 */

import type { ShaderSpec } from '../schemas/shader-spec';
import { createDefaultSpec, normalizeShaderSpec } from '../schemas/normalize-shader-spec';
import type { AIProvider } from '../integration/types/ai-provider';

const SPEC_SYSTEM_PROMPT = `You are a shader intent parser. Given a user's natural language description of a visual effect, output a JSON object matching this exact schema. Output ONLY valid JSON, no explanations, no markdown fences.

{
  "scene": { "type": "string (scene category)", "subject": "string (2-5 words)", "composition": "fullscreen|center_focus|layered|minimal|radial|grid" },
  "material": { "type": "string (material)", "secondary": "string" },
  "style": { "mood": "dreamy|cyberpunk|minimal|premium|organic|energetic|dark|cosmic|alien|retro|brutal|ethereal", "visualStyle": "realistic|stylized|abstract|generative|glitch|cinematic|technical" },
  "motion": { "type": "flow|pulse|swirl|wave|rotate|drift|orbit|turbulence|growth|collapse|reactive|static", "camera": "static|orbit|flythrough|zoom|dolly|shake" },
  "depth": { "approach": "flat|layered|volumetric|raymarched|sdf|implied" },
  "lighting": { "model": "ambient|directional|point|rim|volumetric|emissive|pbr|stylized", "description": "string" },
  "color": { "palette": "purple_blue|deep_space|neon_cyber|warm_sunset|gold_white|monochrome|custom", "colors": ["hex strings"], "description": "string" },
  "interaction": { "type": "none|mouse_reactive|mouse_click|time_only|scroll" },
  "constraints": { "performance": "mobile_safe|desktop_balanced|high_quality", "maxIterations": 16-64, "allowRaymarching": bool, "allowTextures": false }
}

Rules:
- Output ONLY JSON, no markdown fences, no explanation
- Use "abstract" for general artistic requests, "unknown" if unclear
- Self-luminous materials (plasma, fire, energy) → lighting model "emissive"
- Reflective materials (crystal, metal, ice) → "pbr"
- Gaseous materials (smoke, nebula) → "volumetric"
- "raymarch/sphere/3D" → allowRaymarching: true
- default performance: "desktop_balanced", maxIterations: 32, allowRaymarching: false
- Do NOT output numerical style/motion values. The renderer interprets freely.`;

/**
 * Lightweight keyword-based default inference.
 * Used when no LLM is configured. Not as deep as LLM path, but covers
 * common patterns.
 */
export function inferSpecFromKeywords(prompt: string): ShaderSpec {
  const lower = prompt.toLowerCase();
  const spec = createDefaultSpec();

  if (/\b(nebula|galaxy|cosmic|space|stars|cloud[s]?|dust)\b/.test(lower)) {
    spec.scene.type = 'nebula';
    spec.material.type = 'nebula_gas';
    spec.lighting.model = 'emissive';
    spec.depth.approach = 'volumetric';
  } else if (/\b(ocean|sea|water|wave[a-z]*)\b/.test(lower)) {
    spec.scene.type = 'ocean';
    spec.material.type = 'liquid';
    spec.lighting.model = 'directional';
  } else if (/\b(fire|flame|burn|ember)\b/.test(lower)) {
    spec.scene.type = 'fire';
    spec.material.type = 'fire';
    spec.lighting.model = 'emissive';
  } else if (/\b(particle[s]?|dot[a-z]*|sparks?|trail[a-z]*)\b/.test(lower)) {
    spec.scene.type = 'particles';
    spec.material.type = 'energy';
  } else if (/\b(liquid|water|flow[a-z]*)\b/.test(lower) && !/\bocean\b/.test(lower)) {
    spec.scene.type = 'liquid';
    spec.material.type = 'liquid';
  } else if (/\b(tunnel|wormhole|vortex|portal)\b/.test(lower)) {
    spec.scene.type = 'tunnel';
    spec.scene.composition = 'center_focus';
  } else if (/\b(mandala|symmetry|geometric|pattern)\b/.test(lower)) {
    spec.scene.type = 'mandala';
    spec.scene.composition = 'center_focus';
  } else if (/\b(terrain|landscape|mountain[a-z]*|hill[a-z]*)\b/.test(lower)) {
    spec.scene.type = 'terrain';
    spec.depth.approach = 'layered';
  } else if (/\b(sphere|orb|ball|3d|raymarch)\b/.test(lower)) {
    spec.scene.type = 'sphere';
    spec.depth.approach = 'raymarched';
    spec.constraints.allowRaymarching = true;
  } else if (/\b(gradient|color[s]?|abstract|flow[a-z]*)\b/.test(lower)) {
    spec.scene.type = 'abstract';
  }

  if (/\b(neon|cyber|punk|electric|glitch|grid)\b/.test(lower)) {
    spec.style.mood = 'cyberpunk';
    spec.color.palette = 'neon_cyber';
  } else if (/\b(dreamy|soft|ethereal|mist[a-z]*|cloud[a-z]*)\b/.test(lower)) {
    spec.style.mood = 'dreamy';
  } else if (/\b(dark|moody|void|black)\b/.test(lower)) {
    spec.style.mood = 'dark';
    spec.color.palette = 'deep_space';
  } else if (/\b(warm|orange|red|gold|sunset|ember)\b/.test(lower)) {
    spec.style.mood = 'organic';
    spec.color.palette = 'warm_sunset';
  } else if (/\b(minimal|clean|simple|monochrome|gray|mono)\b/.test(lower)) {
    spec.style.mood = 'minimal';
    spec.color.palette = 'monochrome';
  } else if (/\b(premium|elegant|rich|deep)\b/.test(lower)) {
    spec.style.mood = 'premium';
  } else if (/\b(energetic|fast|wild|intense)\b/.test(lower)) {
    spec.style.mood = 'energetic';
  } else if (/\b(organic|biology|cell|growth|morph)\b/.test(lower)) {
    spec.style.mood = 'organic';
  } else if (/\b(cosmic|space|nebula|galaxy)\b/.test(lower)) {
    spec.style.mood = 'cosmic';
  }

  if (/\b(purple|violet|blue|indigo|magenta)\b/.test(lower)) {
    spec.color.palette = 'purple_blue';
  } else if (/\b(cyan|teal)\b/.test(lower)) {
    spec.color.palette = 'deep_space';
  } else if (/\b(pink|hot)\b/.test(lower)) {
    spec.color.palette = 'neon_cyber';
  } else if (/\b(green|forest|earth|wood)\b/.test(lower)) {
    spec.color.palette = 'gold_white';
  }

  if (/\b(rotate|spin|orbit|radial|pulse)\b/.test(lower)) {
    spec.motion.type = 'pulse';
  } else if (/\b(swirl|twist|curl)\b/.test(lower)) {
    spec.motion.type = 'swirl';
  } else if (/\b(wave[a-z]*|oscillat[a-z]*)\b/.test(lower)) {
    spec.motion.type = 'wave';
  } else if (/\b(grow[a-z]*|exp[a-z]*)\b/.test(lower)) {
    spec.motion.type = 'growth';
  } else if (/\b(collaps|implod|compres)\b/.test(lower)) {
    spec.motion.type = 'collapse';
  } else if (/\b(turbulence|chaos|wild)\b/.test(lower)) {
    spec.motion.type = 'turbulence';
  } else if (/\b(still|static|no motion|calm)\b/.test(lower)) {
    spec.motion.type = 'static';
  }

  if (/\b(flythrough|fly through|camera move|moving camera)\b/.test(lower)) {
    spec.motion.camera = 'flythrough';
  } else if (/\b(zoom)\b/.test(lower)) {
    spec.motion.camera = 'zoom';
  } else if (/\b(orbit|around)\b/.test(lower)) {
    spec.motion.camera = 'orbit';
  }

  if (/\b(3d|3-d|three-dimensional|raymarch|sdf)\b/.test(lower)) {
    spec.constraints.allowRaymarching = true;
  }
  if (/\b(mobile|low-power|simple|fast)\b/.test(lower)) {
    spec.constraints.performance = 'mobile_safe';
    spec.constraints.maxIterations = 24;
  } else if (/\b(high quality|complex|detailed|heavy)\b/.test(lower)) {
    spec.constraints.performance = 'high_quality';
    spec.constraints.maxIterations = 64;
  }

  if (/\b(mouse|click|interact|touch)\b/.test(lower)) {
    spec.interaction.type = 'mouse_reactive';
  } else if (/\b(scroll)\b/.test(lower)) {
    spec.interaction.type = 'scroll';
  } else {
    spec.interaction.type = 'time_only';
  }

  return spec;
}

/**
 * Parse a user prompt into a ShaderSpec.
 * Strategy: if LLM provider is configured, route through chatCompletion.
 *           otherwise, use deterministic keyword inference.
 */
export async function parseShaderSpec(
  prompt: string,
  provider: AIProvider | null | undefined,
): Promise<ShaderSpec> {
  if (!provider || !provider.isConfigured()) {
    return inferSpecFromKeywords(prompt);
  }
  return parseShaderSpecWithLLM(prompt, provider);
}

export async function parseShaderSpecWithLLM(
  prompt: string,
  provider: AIProvider,
): Promise<ShaderSpec> {
  try {
    const raw = await provider.chatCompletion([
      { role: 'system', content: SPEC_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);
    const jsonStr = extractJson(raw);
    if (!jsonStr) {
      return inferSpecFromKeywords(prompt);
    }
    const parsed = JSON.parse(jsonStr);
    return normalizeShaderSpec(parsed);
  } catch {
    return inferSpecFromKeywords(prompt);
  }
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  return braceMatch ? braceMatch[0] : null;
}
