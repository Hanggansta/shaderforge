/**
 * Agent 2 — Shader Planner
 *
 * Deterministic TypeScript function. Maps VisualCard -> ShaderPlan.
 * No LLM call. V2 can introduce an LLM-based planner.
 */

import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import { planTechnique } from './plan-technique';

export interface ShaderPlannerInput {
  visualCard: VisualCard;
}

export function runShaderPlanner(input: ShaderPlannerInput): ShaderPlan {
  return planTechnique(input.visualCard);
}
