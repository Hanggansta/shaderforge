/**
 * ShaderSpec — Structured Visual Intent
 *
 * Captures the full visual intent of a user's shader request. This is the
 * "creative brief" that Agent 1 (VisualStructurer) fills in from a free-form
 * prompt, and Agent 2 (ShaderPlanner) maps to a TechniquePlan.
 *
 * No numerical constraints — the LLM interprets these fields freely for
 * maximum visual impact. Based on DESIGN.md quality bar: composition, depth,
 * color harmony, motion quality, material richness, procedural detail,
 * editability, performance safety.
 */

export type SceneType =
  | 'abstract' | 'nebula' | 'ocean' | 'fire' | 'particles'
  | 'liquid' | 'tunnel' | 'terrain' | 'mandala' | 'sphere'
  | 'cosmic' | 'crystalline' | 'biological' | 'architectural' | 'energy'
  | 'plasma' | 'fractal' | 'volumetric' | 'unknown';

export type Composition =
  | 'fullscreen' | 'center_focus' | 'layered_depth' | 'minimal_field' | 'radial' | 'grid';

export type MaterialType =
  | 'plasma' | 'nebula_gas' | 'liquid' | 'smoke' | 'fire' | 'crystal'
  | 'metal' | 'organic' | 'energy' | 'stone' | 'ice' | 'fabric'
  | 'light' | 'void' | 'hologram' | 'abstract';

export type Mood =
  | 'dreamy' | 'cyberpunk' | 'minimal' | 'premium' | 'organic'
  | 'energetic' | 'dark' | 'cosmic' | 'alien' | 'retro'
  | 'brutal' | 'ethereal';

export type VisualStyle =
  | 'realistic' | 'stylized' | 'abstract' | 'generative' | 'glitch' | 'cinematic' | 'technical';

export type MotionType =
  | 'flow' | 'pulse' | 'swirl' | 'wave' | 'rotate' | 'drift'
  | 'orbit' | 'turbulence' | 'growth' | 'collapse' | 'reactive' | 'static';

export type CameraMotion =
  | 'static' | 'orbit' | 'flythrough' | 'zoom' | 'dolly' | 'shake';

export type DepthApproach =
  | 'flat' | 'layered' | 'volumetric' | 'raymarched' | 'sdf' | 'implied';

export type LightingModel =
  | 'ambient' | 'directional' | 'point' | 'rim' | 'volumetric' | 'emissive' | 'pbr' | 'stylized';

export type InteractionType =
  | 'none' | 'mouse_reactive' | 'mouse_click' | 'time_only' | 'scroll';

export type Palette =
  | 'purple_blue' | 'deep_space' | 'neon_cyber' | 'warm_sunset'
  | 'gold_white' | 'monochrome' | 'ocean_deep' | 'fire_ember'
  | 'forest_earth' | 'ice_crystal' | 'alien_bio' | 'retro_crt' | 'custom';

export type PerformanceTarget = 'mobile_safe' | 'desktop_balanced' | 'high_quality';

export interface ShaderSpec {
  intent: 'create' | 'modify' | 'fix' | 'explain' | 'optimize';

  scene: {
    type: SceneType;
    subject?: string;
    composition: Composition;
  };

  material: {
    type: MaterialType;
    secondary?: MaterialType;
  };

  style: {
    mood: Mood;
    visualStyle?: VisualStyle;
  };

  motion: {
    type: MotionType;
    camera?: CameraMotion;
  };

  depth: {
    approach: DepthApproach;
  };

  lighting: {
    model: LightingModel;
    description?: string;
  };

  color: {
    palette: Palette;
    colors?: string[];
    description?: string;
  };

  interaction: {
    type: InteractionType;
  };

  constraints: {
    target: 'webgl2';
    performance: PerformanceTarget;
    maxIterations: number;
    allowRaymarching: boolean;
    allowTextures: false;
  };

  modification?: {
    currentProblem?: string;
    requestedChange?: string;
    preserve?: string[];
  };

  reference?: {
    imagePath?: string;
    matchTargets?: string[];
  };
}
