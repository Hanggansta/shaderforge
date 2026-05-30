/**
 * Golden Example Selector
 * Deterministic scoring to select relevant reference shaders.
 * No LLM calls, no vector search, no external dependencies.
 */

import type { ShaderSpec } from '../spec/shader-spec';
import type { TechniquePlan } from '../planner/technique-plan';
import type { GoldenShaderExample } from './golden-shader';
import { GOLDEN_SHADERS } from './golden-shaders';

/**
 * Select the most relevant golden examples for a given spec + plan.
 * Returns at most maxExamples examples (default 2).
 * Never fails — returns [] if no good matches.
 */
export function selectGoldenExamples(
  spec: ShaderSpec,
  plan: TechniquePlan,
  maxExamples: number = 2,
): GoldenShaderExample[] {
  const scored = GOLDEN_SHADERS.map(example => ({
    example,
    score: scoreExample(example, spec, plan),
  }));

  // Sort by score descending, filter out zero scores
  scored.sort((a, b) => b.score - a.score);

  const selected: GoldenShaderExample[] = [];
  for (const { example, score } of scored) {
    if (score <= 0) break;
    if (selected.length >= maxExamples) break;
    // Skip if performance budget doesn't match
    if (!performanceMatches(example.performance, spec.constraints.performance)) continue;
    selected.push(example);
  }

  return selected;
}

/**
 * Score an example against the spec and plan.
 * Higher = better match. 0 = no match.
 */
function scoreExample(
  example: GoldenShaderExample,
  spec: ShaderSpec,
  plan: TechniquePlan,
): number {
  let score = 0;

  // Scene type match (highest weight)
  if (example.sceneTypes.includes(spec.scene.type)) {
    score += 10;
  }

  // Base technique match
  if (example.baseTechniques.includes(plan.baseTechnique)) {
    score += 8;
  }

  // Mood match
  if (example.moods.includes(spec.style.mood)) {
    score += 4;
  }

  // Palette match
  if (example.palettes.includes(spec.color.palette)) {
    score += 3;
  }

  // Tag relevance (check if any spec keywords appear in tags)
  const specWords = [
    spec.scene.type,
    spec.scene.subject,
    spec.style.mood,
    spec.motion.type,
    spec.color.palette,
  ].filter(Boolean).map(w => (w as string).toLowerCase());

  let tagMatches = 0;
  for (const tag of example.tags) {
    if (specWords.some(w => w.includes(tag) || tag.includes(w))) {
      tagMatches++;
    }
  }
  score += tagMatches;

  // Specificity bonus: prefer examples whose tags directly match mood or palette
  const moodInTags = example.tags.includes(spec.style.mood);
  const paletteInTags = example.tags.includes(spec.color.palette);
  if (moodInTags) score += 2;
  if (paletteInTags) score += 2;

  return score;
}

/**
 * Check if the example's performance level is compatible with the spec's budget.
 * mobile_safe examples work everywhere.
 * desktop_balanced examples work for desktop_balanced and high_quality.
 * high_quality examples only work for high_quality.
 */
function performanceMatches(
  examplePerf: string,
  specPerf: string,
): boolean {
  const levels: Record<string, number> = {
    mobile_safe: 0,
    desktop_balanced: 1,
    high_quality: 2,
  };
  const exLevel = levels[examplePerf] ?? 1;
  const specLevel = levels[specPerf] ?? 1;
  return exLevel <= specLevel;
}
