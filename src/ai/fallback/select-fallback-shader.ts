/**
 * Fallback Shader Selector
 * Selects a safe fallback shader based on ShaderSpec and TechniquePlan.
 * Used only when all AgentLoop attempts fail.
 */

import type { ShaderSpec } from '../spec/shader-spec';
import type { TechniquePlan } from '../planner/technique-plan';
import { FALLBACK_SHADERS, type FallbackShader } from './fallback-shaders';

/**
 * Select a fallback shader matching the spec and plan.
 * Returns the best match or the abstract gradient as ultimate fallback.
 */
export function selectFallbackShader(
  spec: ShaderSpec,
  plan: TechniquePlan,
): FallbackShader {
  let best = FALLBACK_SHADERS[0]; // abstract gradient as ultimate fallback
  let bestScore = -1;

  for (const shader of FALLBACK_SHADERS) {
    let score = 0;
    if (shader.sceneTypes.includes(spec.scene.type)) score += 10;
    if (shader.baseTechniques.includes(plan.baseTechnique)) score += 8;
    if (score > bestScore) {
      bestScore = score;
      best = shader;
    }
  }

  return best;
}
