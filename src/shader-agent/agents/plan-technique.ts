/**
 * Technique Planner
 * Deterministic mapping from ShaderSpec to TechniquePlan.
 * Pure TypeScript — no LLM calls.
 */

import type { ShaderSpec } from '../schemas/shader-spec';
import type {
  TechniquePlan, BaseTechnique, CoordinateSystem, NoiseMethod,
  MotionMethod, ColorMethod, Effect, CompositionMode,
} from './technique-plan';

const SCENE_TECHNIQUE: Record<string, { base: BaseTechnique; coord: CoordinateSystem; noise: NoiseMethod }> = {
  nebula:    { base: 'fbm_nebula',           coord: 'centered_uv', noise: 'domain_warped_fbm' },
  particles: { base: 'procedural_particles', coord: 'centered_uv', noise: 'value_noise' },
  liquid:    { base: 'liquid_waves',         coord: 'cartesian',   noise: 'fbm' },
  ocean:     { base: 'liquid_waves',         coord: 'cartesian',   noise: 'value_noise' },
  fire:      { base: 'fire_noise',           coord: 'centered_uv', noise: 'fbm' },
  tunnel:    { base: 'polar_tunnel',         coord: 'polar',       noise: 'value_noise' },
  mandala:   { base: 'mandala_symmetry',     coord: 'polar',       noise: 'none' },
  terrain:   { base: 'terrain_heightfield',  coord: 'cartesian',   noise: 'fbm' },
  abstract:  { base: 'abstract_flow',        coord: 'centered_uv', noise: 'fbm' },
  sphere:    { base: 'raymarching',          coord: 'centered_uv', noise: 'none' },
  unknown:   { base: 'abstract_flow',        coord: 'centered_uv', noise: 'fbm' },
};

const SCENE_DEFAULT_MOTION: Record<string, MotionMethod> = {
  nebula: 'swirl_flow', particles: 'upward_flow', liquid: 'sine_wave', ocean: 'sine_wave',
  fire: 'upward_flow', tunnel: 'radial_pulse', mandala: 'radial_pulse', terrain: 'time_drift',
  abstract: 'time_drift', sphere: 'time_drift', unknown: 'time_drift',
};

const SPEC_MOTION_MAP: Record<string, MotionMethod> = {
  flow: 'time_drift', pulse: 'radial_pulse', swirl: 'swirl_flow', wave: 'sine_wave',
  rotate: 'radial_pulse', drift: 'time_drift', static: 'static',
};

const PALETTE_COLOR_METHOD: Record<string, ColorMethod> = {
  purple_blue: 'palette_gradient', deep_space: 'density_coloring', neon_cyber: 'neon_ramp',
  warm_sunset: 'warm_ramp', gold_white: 'palette_gradient', monochrome: 'monochrome_ramp', custom: 'palette_gradient',
};

const SCENE_COMPOSITION: Record<string, CompositionMode> = {
  nebula: 'fullscreen_texture', particles: 'center_focus', liquid: 'fullscreen_texture',
  ocean: 'fullscreen_texture', fire: 'fullscreen_texture', tunnel: 'center_focus',
  mandala: 'center_focus', terrain: 'layered_depth', abstract: 'fullscreen_texture',
  sphere: 'center_focus', unknown: 'fullscreen_texture',
};

const SPEC_COMPOSITION_MAP: Record<string, CompositionMode> = {
  fullscreen: 'fullscreen_texture', center_focus: 'center_focus',
  layered: 'layered_depth', minimal: 'minimal_field',
};

const PERF_BUDGET: Record<string, number> = {
  mobile_safe: 32, desktop_balanced: 48, high_quality: 64,
};

const BASE_AVOID = [
  'sampler2D', 'samplerCube', 'texture()', 'iChannel',
  'multipass', 'bufferA', 'bufferB', 'bufferC', 'bufferD',
  '#version', '#ifdef GL_ES',
  'out parameters in helpers', 'inout parameters in helpers',
  'redefining built-in functions',
];

export function planTechnique(spec: ShaderSpec): TechniquePlan {
  const sceneKey = spec.scene.type in SCENE_TECHNIQUE ? spec.scene.type : 'unknown';
  const sceneDef = SCENE_TECHNIQUE[sceneKey];

  let coordSystem = sceneDef.coord;
  if (spec.scene.composition === 'center_focus') coordSystem = 'centered_uv';
  if (spec.scene.composition === 'minimal_field') coordSystem = 'cartesian';
  if (spec.scene.composition === 'radial') coordSystem = 'polar';

  let noise = sceneDef.noise;
  if (['nebula_gas', 'smoke', 'plasma'].includes(spec.material.type) && noise === 'value_noise') {
    noise = 'fbm';
  }
  if (spec.depth.approach === 'volumetric' && noise !== 'domain_warped_fbm') {
    noise = 'fbm';
  }

  const motion = SPEC_MOTION_MAP[spec.motion.type]
    || SCENE_DEFAULT_MOTION[sceneKey]
    || 'time_drift';

  const colorMethod = PALETTE_COLOR_METHOD[spec.color.palette] || 'palette_gradient';

  const effects: Effect[] = ['soft_glow'];
  if (['crystal', 'metal', 'ice'].includes(spec.material.type)) effects.push('bloom_like');
  if (spec.depth.approach === 'volumetric' || spec.depth.approach === 'raymarched') effects.push('bloom_like');
  if (['tunnel', 'mandala', 'sphere'].includes(spec.scene.type) || spec.scene.composition === 'radial') effects.push('vignette');
  if (['nebula', 'abstract', 'cosmic', 'volumetric'].includes(spec.scene.type)) {
    if (!effects.includes('bloom_like')) effects.push('bloom_like');
  }

  const composition = SPEC_COMPOSITION_MAP[spec.scene.composition]
    || SCENE_COMPOSITION[sceneKey]
    || 'fullscreen_texture';

  const performance = spec.constraints.performance;
  const maxLoopBudget = Math.round(PERF_BUDGET[performance] || 48);

  const avoid = [...BASE_AVOID];
  if (!spec.constraints.allowRaymarching) {
    avoid.push('raymarching', 'ray marching', 'sphere tracing');
  }

  const promptHints: string[] = [];
  if (spec.scene.subject) promptHints.push(`Focus the visual on: ${spec.scene.subject}`);
  if (spec.material.type !== 'abstract') promptHints.push(`Make the ${spec.material.type} material visually recognizable`);
  if (spec.depth.approach !== 'flat') promptHints.push(`Create depth using ${spec.depth.approach} technique`);
  if (spec.lighting.model !== 'ambient') promptHints.push(`Use ${spec.lighting.model} lighting for visual richness`);
  promptHints.push('Create strong visual impact with rich contrast and vivid colors');
  promptHints.push('Use the full brightness range — avoid washed-out or dull output');

  return {
    baseTechnique: sceneDef.base,
    coordinateSystem: coordSystem,
    noise,
    motion,
    colorMethod,
    effects,
    composition,
    performance,
    maxLoopBudget,
    avoid,
    promptHints,
  };
}
