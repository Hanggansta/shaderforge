/**
 * Shader Result — the final output of a successful generate or patch run.
 */

import type { VisualCard } from './visual-card';
import type { ShaderPlan } from './shader-plan';
import type { ReferenceCard } from './reference-card';
import type { CompileReport } from './compile-report';

export interface ScreenshotFrame {
  t: number;
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ShaderResult {
  code: string;
  source: 'generated' | 'patched' | 'fallback';
  attempts: number;
  visualCard: VisualCard;
  shaderPlan: ShaderPlan;
  references: ReferenceCard[];
  compileReport: CompileReport;
  visualScore?: number;
  visualBreakdown?: Record<string, { score: number; reason: string }>;
  screenshots?: ScreenshotFrame[];
  selectedCandidateId?: string;
}
