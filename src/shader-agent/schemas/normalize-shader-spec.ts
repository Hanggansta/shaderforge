/**
 * ShaderSpec Normalizer
 * Validates and corrects an arbitrary object into a valid ShaderSpec.
 * All invalid/missing/out-of-range values are corrected to safe defaults.
 */

import type {
  ShaderSpec, SceneType, Composition, Mood, MotionType, Palette, PerformanceTarget,
  MaterialType, DepthApproach, LightingModel, InteractionType, CameraMotion, VisualStyle,
} from './shader-spec';

const SCENE_TYPES: SceneType[] = [
  'abstract', 'nebula', 'ocean', 'fire', 'particles',
  'liquid', 'tunnel', 'terrain', 'mandala', 'sphere',
  'cosmic', 'crystalline', 'biological', 'architectural', 'energy',
  'plasma', 'fractal', 'volumetric', 'unknown',
];

const COMPOSITIONS: Composition[] = [
  'fullscreen', 'center_focus', 'layered_depth', 'minimal_field', 'radial', 'grid',
];

const MOODS: Mood[] = [
  'dreamy', 'cyberpunk', 'minimal', 'premium', 'organic', 'energetic',
  'dark', 'cosmic', 'alien', 'retro', 'brutal', 'ethereal',
];

const MOTION_TYPES: MotionType[] = [
  'flow', 'pulse', 'swirl', 'wave', 'rotate', 'drift',
  'orbit', 'turbulence', 'growth', 'collapse', 'reactive', 'static',
];

const PALETTES: Palette[] = [
  'purple_blue', 'deep_space', 'neon_cyber', 'warm_sunset',
  'gold_white', 'monochrome', 'ocean_deep', 'fire_ember',
  'forest_earth', 'ice_crystal', 'alien_bio', 'retro_crt', 'custom',
];

const PERF_TARGETS: PerformanceTarget[] = ['mobile_safe', 'desktop_balanced', 'high_quality'];

const INTENTS = ['create', 'modify', 'fix', 'explain', 'optimize'] as const;

const MATERIAL_TYPES: MaterialType[] = [
  'plasma', 'nebula_gas', 'liquid', 'smoke', 'fire', 'crystal', 'metal',
  'organic', 'energy', 'stone', 'ice', 'fabric', 'light', 'void', 'hologram', 'abstract',
];

const DEPTH_APPROACHES: DepthApproach[] = [
  'flat', 'layered', 'volumetric', 'raymarched', 'sdf', 'implied',
];

const LIGHTING_MODELS: LightingModel[] = [
  'ambient', 'directional', 'point', 'rim', 'volumetric', 'emissive', 'pbr', 'stylized',
];

const INTERACTION_TYPES: InteractionType[] = [
  'none', 'mouse_reactive', 'mouse_click', 'time_only', 'scroll',
];

const CAMERA_MOTIONS: CameraMotion[] = [
  'static', 'orbit', 'flythrough', 'zoom', 'dolly', 'shake',
];

const VISUAL_STYLES: VisualStyle[] = [
  'realistic', 'stylized', 'abstract', 'generative', 'glitch', 'cinematic', 'technical',
];

function pickEnum<T extends string>(v: unknown, valid: T[], fallback: T): T {
  if (typeof v === 'string' && (valid as string[]).includes(v)) return v as T;
  return fallback;
}

export function createDefaultSpec(intent: ShaderSpec['intent'] = 'create'): ShaderSpec {
  return {
    intent,
    scene: { type: 'unknown', composition: 'fullscreen' },
    material: { type: 'abstract' },
    style: { mood: 'dreamy' },
    motion: { type: 'flow' },
    depth: { approach: 'flat' },
    lighting: { model: 'ambient' },
    color: { palette: 'purple_blue' },
    interaction: { type: 'time_only' },
    constraints: {
      target: 'webgl2',
      performance: 'desktop_balanced',
      maxIterations: 32,
      allowRaymarching: false,
      allowTextures: false,
    },
  };
}

function inferMaterial(sceneType: SceneType): MaterialType {
  const map: Record<string, MaterialType> = {
    nebula: 'nebula_gas', ocean: 'liquid', fire: 'fire', particles: 'energy',
    liquid: 'liquid', tunnel: 'plasma', terrain: 'stone', sphere: 'crystal',
    cosmic: 'nebula_gas', crystalline: 'crystal', biological: 'organic',
    architectural: 'metal', energy: 'energy', plasma: 'plasma',
    fractal: 'abstract', volumetric: 'smoke',
  };
  return map[sceneType] || 'abstract';
}

function inferDepth(sceneType: SceneType, allowRaymarching: boolean): DepthApproach {
  if (allowRaymarching && ['sphere', 'tunnel', 'architectural'].includes(sceneType)) return 'raymarched';
  const map: Record<string, DepthApproach> = {
    nebula: 'volumetric', ocean: 'layered', fire: 'volumetric', particles: 'layered',
    liquid: 'flat', tunnel: 'raymarched', terrain: 'layered', sphere: 'raymarched',
    cosmic: 'volumetric', volumetric: 'volumetric',
  };
  return map[sceneType] || 'implied';
}

function inferLighting(material: MaterialType): LightingModel {
  const map: Record<string, LightingModel> = {
    plasma: 'emissive', nebula_gas: 'emissive', liquid: 'directional', smoke: 'volumetric',
    fire: 'emissive', crystal: 'pbr', metal: 'pbr', organic: 'stylized', energy: 'emissive',
    stone: 'directional', ice: 'pbr', fabric: 'directional', light: 'emissive',
    void: 'ambient', hologram: 'stylized', abstract: 'ambient',
  };
  return map[material] || 'ambient';
}

function inferMotion(sceneType: SceneType): MotionType {
  const map: Record<string, MotionType> = {
    nebula: 'drift', ocean: 'wave', fire: 'flow', particles: 'drift', liquid: 'flow',
    tunnel: 'flow', terrain: 'static', sphere: 'rotate', cosmic: 'drift', energy: 'pulse',
    plasma: 'swirl', fractal: 'drift', volumetric: 'drift',
  };
  return map[sceneType] || 'drift';
}

export function normalizeShaderSpec(raw: unknown): ShaderSpec {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const intent = pickEnum(r.intent, [...INTENTS], 'create');

  const sceneRaw = (typeof r.scene === 'object' && r.scene !== null ? r.scene : {}) as Record<string, unknown>;
  const sceneType = pickEnum(sceneRaw.type, SCENE_TYPES, 'unknown');
  const scene: ShaderSpec['scene'] = {
    type: sceneType,
    subject: typeof sceneRaw.subject === 'string' ? sceneRaw.subject : undefined,
    composition: pickEnum(sceneRaw.composition, COMPOSITIONS, 'fullscreen'),
  };

  const materialRaw = (typeof r.material === 'object' && r.material !== null ? r.material : {}) as Record<string, unknown>;
  const material: ShaderSpec['material'] = {
    type: pickEnum(materialRaw.type, MATERIAL_TYPES, inferMaterial(sceneType)),
    secondary: materialRaw.secondary ? pickEnum(materialRaw.secondary, MATERIAL_TYPES, undefined as unknown as MaterialType) : undefined,
  };

  const styleRaw = (typeof r.style === 'object' && r.style !== null ? r.style : {}) as Record<string, unknown>;
  const style: ShaderSpec['style'] = {
    mood: pickEnum(styleRaw.mood, MOODS, 'dreamy'),
    visualStyle: styleRaw.visualStyle ? pickEnum(styleRaw.visualStyle, VISUAL_STYLES, undefined as unknown as VisualStyle) : undefined,
  };

  const motionRaw = (typeof r.motion === 'object' && r.motion !== null ? r.motion : {}) as Record<string, unknown>;
  const motion: ShaderSpec['motion'] = {
    type: pickEnum(motionRaw.type, MOTION_TYPES, inferMotion(sceneType)),
    camera: motionRaw.camera ? pickEnum(motionRaw.camera, CAMERA_MOTIONS, undefined as unknown as CameraMotion) : undefined,
  };

  const depthRaw = (typeof r.depth === 'object' && r.depth !== null ? r.depth : {}) as Record<string, unknown>;
  const constraintsRaw = (typeof r.constraints === 'object' && r.constraints !== null ? r.constraints : {}) as Record<string, unknown>;
  const allowRaymarching = constraintsRaw.allowRaymarching === true;
  const depth: ShaderSpec['depth'] = {
    approach: pickEnum(depthRaw.approach, DEPTH_APPROACHES, inferDepth(sceneType, allowRaymarching)),
  };

  const lightingRaw = (typeof r.lighting === 'object' && r.lighting !== null ? r.lighting : {}) as Record<string, unknown>;
  const lighting: ShaderSpec['lighting'] = {
    model: pickEnum(lightingRaw.model, LIGHTING_MODELS, inferLighting(material.type)),
    description: typeof lightingRaw.description === 'string' ? lightingRaw.description : undefined,
  };

  const colorRaw = (typeof r.color === 'object' && r.color !== null ? r.color : {}) as Record<string, unknown>;
  const colors = Array.isArray(colorRaw.colors)
    ? colorRaw.colors.filter((c: unknown) => typeof c === 'string')
    : undefined;
  const color: ShaderSpec['color'] = {
    palette: pickEnum(colorRaw.palette, PALETTES, 'purple_blue'),
    colors,
    description: typeof colorRaw.description === 'string' ? colorRaw.description : undefined,
  };

  const interactionRaw = (typeof r.interaction === 'object' && r.interaction !== null ? r.interaction : {}) as Record<string, unknown>;
  const interaction: ShaderSpec['interaction'] = {
    type: pickEnum(interactionRaw.type, INTERACTION_TYPES, 'time_only'),
  };

  let maxIterations = typeof constraintsRaw.maxIterations === 'number' ? constraintsRaw.maxIterations : 32;
  maxIterations = Math.max(16, Math.min(64, Math.round(maxIterations)));

  const constraints: ShaderSpec['constraints'] = {
    target: 'webgl2',
    performance: pickEnum(constraintsRaw.performance, PERF_TARGETS, 'desktop_balanced'),
    maxIterations,
    allowRaymarching,
    allowTextures: false,
  };

  let modification: ShaderSpec['modification'] | undefined;
  if (typeof r.modification === 'object' && r.modification !== null) {
    const modRaw = r.modification as Record<string, unknown>;
    const preserve = Array.isArray(modRaw.preserve)
      ? modRaw.preserve.filter((s: unknown) => typeof s === 'string')
      : undefined;
    modification = {
      currentProblem: typeof modRaw.currentProblem === 'string' ? modRaw.currentProblem : undefined,
      requestedChange: typeof modRaw.requestedChange === 'string' ? modRaw.requestedChange : undefined,
      preserve,
    };
  }

  let reference: ShaderSpec['reference'] | undefined;
  if (typeof r.reference === 'object' && r.reference !== null) {
    const refRaw = r.reference as Record<string, unknown>;
    const matchTargets = Array.isArray(refRaw.matchTargets)
      ? refRaw.matchTargets.filter((s: unknown) => typeof s === 'string')
      : undefined;
    reference = {
      imagePath: typeof refRaw.imagePath === 'string' ? refRaw.imagePath : undefined,
      matchTargets,
    };
  }

  return { intent, scene, material, style, motion, depth, lighting, color, interaction, constraints, modification, reference };
}
