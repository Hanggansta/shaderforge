/**
 * TechniquePlan
 * Deterministic mapping from ShaderSpec to concrete shader techniques.
 * Not an LLM call — pure TypeScript logic.
 */

export type BaseTechnique =
  | 'gradient_field'
  | 'fbm_nebula'
  | 'procedural_particles'
  | 'liquid_waves'
  | 'polar_tunnel'
  | 'fire_noise'
  | 'mandala_symmetry'
  | 'terrain_heightfield'
  | 'abstract_flow';

export type CoordinateSystem = 'cartesian' | 'polar' | 'centered_uv';

export type NoiseMethod =
  | 'none'
  | 'value_noise'
  | 'fbm'
  | 'domain_warped_fbm'
  | 'curl_like_flow';

export type MotionMethod =
  | 'static'
  | 'time_drift'
  | 'sine_wave'
  | 'radial_pulse'
  | 'swirl_flow'
  | 'upward_flow';

export type ColorMethod =
  | 'palette_gradient'
  | 'radial_gradient'
  | 'density_coloring'
  | 'neon_ramp'
  | 'warm_ramp'
  | 'monochrome_ramp';

export type Effect =
  | 'soft_glow'
  | 'vignette'
  | 'bloom_like'
  | 'scanlines'
  | 'grain';

export type CompositionMode =
  | 'fullscreen_texture'
  | 'center_focus'
  | 'layered_depth'
  | 'minimal_field';

export type PerformanceLevel = 'mobile_safe' | 'desktop_balanced' | 'high_quality';

export interface TechniquePlan {
  baseTechnique: BaseTechnique;
  coordinateSystem: CoordinateSystem;
  noise: NoiseMethod;
  motion: MotionMethod;
  colorMethod: ColorMethod;
  effects: Effect[];
  composition: CompositionMode;
  performance: PerformanceLevel;
  maxLoopBudget: number;
  avoid: string[];
  promptHints: string[];
}
