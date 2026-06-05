/**
 * Shader Plan — the implementation strategy produced by Agent 2.
 * Re-exports the canonical TechniquePlan type.
 */

import type { TechniquePlan } from '../agents/technique-plan';
export type ShaderPlan = TechniquePlan;
export {
  type BaseTechnique,
  type CoordinateSystem,
  type NoiseMethod,
  type MotionMethod,
  type ColorMethod,
  type Effect,
  type CompositionMode,
  type PerformanceLevel,
} from '../agents/technique-plan';
