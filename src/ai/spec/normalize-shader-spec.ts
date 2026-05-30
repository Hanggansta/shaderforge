/**
 * ShaderSpec Normalizer
 * Validates and corrects an arbitrary object into a valid ShaderSpec.
 * All invalid/missing/out-of-range values are corrected to safe defaults.
 */

import type {
  ShaderSpec, SceneType, Composition, Mood, MotionType, Palette, PerformanceTarget,
} from './shader-spec';

// --- Valid enum sets ---

const SCENE_TYPES: SceneType[] = [
  'abstract', 'nebula', 'ocean', 'fire', 'particles',
  'liquid', 'tunnel', 'terrain', 'mandala', 'unknown',
];

const COMPOSITIONS: Composition[] = ['fullscreen', 'center_focus', 'layered', 'minimal'];
const MOODS: Mood[] = ['dreamy', 'cyberpunk', 'minimal', 'premium', 'organic', 'energetic'];
const MOTION_TYPES: MotionType[] = ['flow', 'pulse', 'swirl', 'wave', 'rotate', 'drift', 'static'];
const PALETTES: Palette[] = [
  'purple_blue', 'deep_space', 'neon_cyber', 'warm_sunset',
  'gold_white', 'monochrome', 'custom',
];
const PERF_TARGETS: PerformanceTarget[] = ['mobile_safe', 'desktop_balanced', 'high_quality'];
const INTENTS = ['create', 'modify', 'fix', 'explain', 'optimize'] as const;

// --- Helpers ---

function clamp01(v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}

function pickEnum<T extends string>(v: unknown, valid: T[], fallback: T): T {
  if (typeof v === 'string' && (valid as string[]).includes(v)) return v as T;
  return fallback;
}

// --- Default spec ---

export function createDefaultSpec(intent: ShaderSpec['intent'] = 'create'): ShaderSpec {
  return {
    intent,
    scene: { type: 'unknown', composition: 'fullscreen' },
    style: { mood: 'dreamy', visualDensity: 0.5, contrast: 0.5, glow: 0.5 },
    motion: { type: 'flow', speed: 0.5, smoothness: 0.5 },
    color: { palette: 'purple_blue' },
    constraints: {
      target: 'webgl2',
      performance: 'desktop_balanced',
      maxIterations: 32,
      allowRaymarching: false,
      allowTextures: false,
    },
  };
}

// --- Normalizer ---

export function normalizeShaderSpec(raw: unknown): ShaderSpec {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const intent = pickEnum(r.intent, [...INTENTS], 'create');

  // Scene
  const sceneRaw = (typeof r.scene === 'object' && r.scene !== null ? r.scene : {}) as Record<string, unknown>;
  const scene: ShaderSpec['scene'] = {
    type: pickEnum(sceneRaw.type, SCENE_TYPES, 'unknown'),
    subject: typeof sceneRaw.subject === 'string' ? sceneRaw.subject : undefined,
    composition: pickEnum(sceneRaw.composition, COMPOSITIONS, 'fullscreen'),
  };

  // Style
  const styleRaw = (typeof r.style === 'object' && r.style !== null ? r.style : {}) as Record<string, unknown>;
  const style: ShaderSpec['style'] = {
    mood: pickEnum(styleRaw.mood, MOODS, 'dreamy'),
    visualDensity: clamp01(styleRaw.visualDensity),
    contrast: clamp01(styleRaw.contrast),
    glow: clamp01(styleRaw.glow),
  };

  // Motion
  const motionRaw = (typeof r.motion === 'object' && r.motion !== null ? r.motion : {}) as Record<string, unknown>;
  const motion: ShaderSpec['motion'] = {
    type: pickEnum(motionRaw.type, MOTION_TYPES, 'flow'),
    speed: clamp01(motionRaw.speed),
    smoothness: clamp01(motionRaw.smoothness),
  };

  // Color
  const colorRaw = (typeof r.color === 'object' && r.color !== null ? r.color : {}) as Record<string, unknown>;
  const colors = Array.isArray(colorRaw.colors)
    ? colorRaw.colors.filter((c: unknown) => typeof c === 'string')
    : undefined;
  const color: ShaderSpec['color'] = {
    palette: pickEnum(colorRaw.palette, PALETTES, 'purple_blue'),
    colors,
  };

  // Constraints
  const consRaw = (typeof r.constraints === 'object' && r.constraints !== null ? r.constraints : {}) as Record<string, unknown>;
  let maxIterations = typeof consRaw.maxIterations === 'number' ? consRaw.maxIterations : 32;
  maxIterations = Math.max(16, Math.min(64, Math.round(maxIterations)));

  const constraints: ShaderSpec['constraints'] = {
    target: 'webgl2',
    performance: pickEnum(consRaw.performance, PERF_TARGETS, 'desktop_balanced'),
    maxIterations,
    allowRaymarching: consRaw.allowRaymarching === true,
    allowTextures: false,
  };

  // Modification (optional)
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

  return { intent, scene, style, motion, color, constraints, modification };
}
