/**
 * Visual Card — the structured visual intent produced by Agent 1.
 * Re-exports the canonical ShaderSpec type.
 */

import type { ShaderSpec } from './shader-spec';
export type VisualCard = ShaderSpec;
export type { ShaderSpec } from './shader-spec';

export type VisualScoreBreakdown = Record<string, { score: number; reason: string }>;
