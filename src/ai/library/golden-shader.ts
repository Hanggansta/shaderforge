/**
 * Golden Shader Example
 * Curated reference shader for spec-aware GLSL generation.
 */

import type { SceneType, Mood, Palette } from '../spec/shader-spec';
import type { BaseTechnique, PerformanceLevel } from '../planner/technique-plan';

export interface GoldenShaderExample {
  id: string;
  title: string;
  sceneTypes: SceneType[];
  baseTechniques: BaseTechnique[];
  moods: Mood[];
  palettes: Palette[];
  performance: PerformanceLevel;
  tags: string[];
  notes: string;
  code: string;
}
