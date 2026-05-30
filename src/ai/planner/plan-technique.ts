/**
 * Technique Planner
 * Deterministic mapping from ShaderSpec to TechniquePlan.
 * Pure TypeScript — no LLM calls.
 */

import type { ShaderSpec } from '../spec/shader-spec';
import type {
  TechniquePlan, BaseTechnique, CoordinateSystem, NoiseMethod,
  MotionMethod, ColorMethod, Effect, CompositionMode,
} from './technique-plan';

// --- Base technique mapping from scene type ---

const SCENE_TECHNIQUE: Record<string, { base: BaseTechnique; coord: CoordinateSystem; noise: NoiseMethod }> = {
  nebula:    { base: 'fbm_nebula',            coord: 'centered_uv', noise: 'domain_warped_fbm' },
  particles: { base: 'procedural_particles',  coord: 'centered_uv', noise: 'value_noise' },
  liquid:    { base: 'liquid_waves',          coord: 'cartesian',   noise: 'fbm' },
  ocean:     { base: 'liquid_waves',          coord: 'cartesian',   noise: 'value_noise' },
  fire:      { base: 'fire_noise',            coord: 'centered_uv', noise: 'fbm' },
  tunnel:    { base: 'polar_tunnel',          coord: 'polar',       noise: 'value_noise' },
  mandala:   { base: 'mandala_symmetry',      coord: 'polar',       noise: 'none' },
  terrain:   { base: 'terrain_heightfield',   coord: 'cartesian',   noise: 'fbm' },
  abstract:  { base: 'abstract_flow',         coord: 'centered_uv', noise: 'fbm' },
  unknown:   { base: 'abstract_flow',         coord: 'centered_uv', noise: 'fbm' },
};

// --- Motion mapping from scene + spec.motion.type ---

const SCENE_DEFAULT_MOTION: Record<string, MotionMethod> = {
  nebula:    'swirl_flow',
  particles: 'upward_flow',
  liquid:    'sine_wave',
  ocean:     'sine_wave',
  fire:      'upward_flow',
  tunnel:    'radial_pulse',
  mandala:   'radial_pulse',
  terrain:   'time_drift',
  abstract:  'time_drift',
  unknown:   'time_drift',
};

const SPEC_MOTION_MAP: Record<string, MotionMethod> = {
  flow:    'time_drift',
  pulse:   'radial_pulse',
  swirl:   'swirl_flow',
  wave:    'sine_wave',
  rotate:  'radial_pulse',
  drift:   'time_drift',
  static:  'static',
};

// --- Color mapping from spec.color.palette ---

const PALETTE_COLOR_METHOD: Record<string, ColorMethod> = {
  purple_blue:  'palette_gradient',
  deep_space:   'density_coloring',
  neon_cyber:   'neon_ramp',
  warm_sunset:  'warm_ramp',
  gold_white:   'palette_gradient',
  monochrome:   'monochrome_ramp',
  custom:       'palette_gradient',
};

// --- Composition mapping from scene ---

const SCENE_COMPOSITION: Record<string, CompositionMode> = {
  nebula:    'fullscreen_texture',
  particles: 'center_focus',
  liquid:    'fullscreen_texture',
  ocean:     'fullscreen_texture',
  fire:      'fullscreen_texture',
  tunnel:    'center_focus',
  mandala:   'center_focus',
  terrain:   'layered_depth',
  abstract:  'fullscreen_texture',
  unknown:   'fullscreen_texture',
};

// --- Performance budget mapping ---

const PERF_BUDGET: Record<string, number> = {
  mobile_safe:      32,
  desktop_balanced: 48,
  high_quality:     64,
};

// --- Default avoid list ---

const BASE_AVOID = [
  'sampler2D', 'samplerCube', 'texture()', 'iChannel',
  'multipass', 'bufferA', 'bufferB', 'bufferC', 'bufferD',
  '#version', '#ifdef GL_ES',
  'out parameters in helpers', 'inout parameters in helpers',
  'redefining built-in functions',
];

// --- Main planner ---

export function planTechnique(spec: ShaderSpec): TechniquePlan {
  const sceneKey = spec.scene.type in SCENE_TECHNIQUE ? spec.scene.type : 'unknown';
  const sceneDef = SCENE_TECHNIQUE[sceneKey];

  // Coordinate system: use scene default, override for certain compositions
  let coordSystem = sceneDef.coord;
  if (spec.scene.composition === 'center_focus') coordSystem = 'centered_uv';
  if (spec.scene.composition === 'minimal') coordSystem = 'cartesian';

  // Noise: use scene default, upgrade for high density
  let noise = sceneDef.noise;
  if (spec.style.visualDensity > 0.7 && noise === 'value_noise') {
    noise = 'fbm';
  }

  // Motion: prefer spec.motion.type, fall back to scene default
  const motion = SPEC_MOTION_MAP[spec.motion.type]
    || SCENE_DEFAULT_MOTION[sceneKey]
    || 'time_drift';

  // Color: prefer spec.color.palette
  const colorMethod = PALETTE_COLOR_METHOD[spec.color.palette]
    || 'palette_gradient';

  // Effects: driven by spec.style.glow and scene
  const effects: Effect[] = [];
  if (spec.style.glow > 0.3) effects.push('soft_glow');
  if (spec.style.glow > 0.7) effects.push('bloom_like');
  if (spec.scene.type === 'tunnel' || spec.scene.type === 'mandala') {
    if (!effects.includes('vignette')) effects.push('vignette');
  }
  if (spec.style.contrast > 0.7) effects.push('grain');

  // Composition
  const composition = SPEC_COMPOSITION_MAP[spec.scene.composition]
    || SCENE_COMPOSITION[sceneKey]
    || 'fullscreen_texture';

  // Performance
  const performance = spec.constraints.performance;

  // Loop budget: base from performance, adjusted by density
  let maxLoopBudget = PERF_BUDGET[performance] || 48;
  if (spec.style.visualDensity > 0.7) maxLoopBudget = Math.min(Math.round(maxLoopBudget * 1.25), 64);
  if (spec.style.visualDensity < 0.3) maxLoopBudget = Math.max(Math.round(maxLoopBudget * 0.75), 16);
  maxLoopBudget = Math.round(maxLoopBudget);

  // Avoid list
  const avoid = [...BASE_AVOID];
  if (!spec.constraints.allowRaymarching) {
    avoid.push('raymarching', 'ray marching', 'sphere tracing');
  }

  // Prompt hints
  const promptHints: string[] = [];
  if (spec.scene.subject) {
    promptHints.push(`Focus the visual on: ${spec.scene.subject}`);
  }
  if (spec.style.visualDensity < 0.3) {
    promptHints.push('Keep the shader minimal and clean — low detail');
  } else if (spec.style.visualDensity > 0.7) {
    promptHints.push('Make the shader rich and detailed — high visual density');
  }
  if (spec.style.contrast < 0.3) {
    promptHints.push('Use soft, low-contrast colors');
  } else if (spec.style.contrast > 0.7) {
    promptHints.push('Use bold, high-contrast colors');
  }
  if (spec.motion.speed < 0.3) {
    promptHints.push('Use slow, gentle animation');
  } else if (spec.motion.speed > 0.7) {
    promptHints.push('Use fast, energetic animation');
  }
  if (spec.motion.smoothness > 0.7) {
    promptHints.push('Animation should be smooth and eased');
  }

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

const SPEC_COMPOSITION_MAP: Record<string, CompositionMode> = {
  fullscreen: 'fullscreen_texture',
  center_focus: 'center_focus',
  layered: 'layered_depth',
  minimal: 'minimal_field',
};
