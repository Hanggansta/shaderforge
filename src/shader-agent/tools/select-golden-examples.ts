/**
 * Golden Example Selector
 * Deterministic scoring to select relevant reference shaders.
 */

import type { ShaderSpec } from '../schemas/shader-spec';
import type { TechniquePlan } from '../agents/technique-plan';
import type { GoldenShaderExample } from './golden-shader';
import { GOLDEN_SHADERS } from './golden-shaders';

export function selectGoldenExamples(
  spec: ShaderSpec,
  plan: TechniquePlan,
  maxExamples: number = 2,
): GoldenShaderExample[] {
  const scored = GOLDEN_SHADERS.map((example) => ({
    example,
    score: scoreExample(example, spec, plan),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected: GoldenShaderExample[] = [];
  for (const { example, score } of scored) {
    if (score <= 0) break;
    if (selected.length >= maxExamples) break;
    if (!performanceMatches(example.performance, spec.constraints.performance)) continue;
    selected.push(example);
  }

  return selected;
}

function scoreExample(
  example: GoldenShaderExample,
  spec: ShaderSpec,
  plan: TechniquePlan,
): number {
  let score = 0;
  if (example.sceneTypes.includes(spec.scene.type)) score += 10;
  if (example.baseTechniques.includes(plan.baseTechnique)) score += 8;
  if (example.moods.includes(spec.style.mood)) score += 4;
  if (example.palettes.includes(spec.color.palette)) score += 3;

  const specWords = [
    spec.scene.type, spec.scene.subject, spec.style.mood,
    spec.motion.type, spec.color.palette,
  ].filter(Boolean).map((w) => (w as string).toLowerCase());

  let tagMatches = 0;
  for (const tag of example.tags) {
    if (specWords.some((w) => w.includes(tag) || tag.includes(w))) tagMatches++;
  }
  score += tagMatches;

  if (example.tags.includes(spec.style.mood)) score += 2;
  if (example.tags.includes(spec.color.palette)) score += 2;

  return score;
}

function performanceMatches(examplePerf: string, specPerf: string): boolean {
  const levels: Record<string, number> = { mobile_safe: 0, desktop_balanced: 1, high_quality: 2 };
  const exLevel = levels[examplePerf] ?? 1;
  const specLevel = levels[specPerf] ?? 1;
  return exLevel <= specLevel;
}
