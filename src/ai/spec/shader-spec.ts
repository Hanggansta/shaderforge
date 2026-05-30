/**
 * ShaderSpec IR
 * Structured intermediate representation between user prompt and GLSL generation.
 * Captures visual intent before the model writes code.
 */

export type SceneType =
  | 'abstract' | 'nebula' | 'ocean' | 'fire' | 'particles'
  | 'liquid' | 'tunnel' | 'terrain' | 'mandala' | 'unknown';

export type Composition = 'fullscreen' | 'center_focus' | 'layered' | 'minimal';

export type Mood =
  | 'dreamy' | 'cyberpunk' | 'minimal' | 'premium' | 'organic' | 'energetic';

export type MotionType = 'flow' | 'pulse' | 'swirl' | 'wave' | 'rotate' | 'drift' | 'static';

export type Palette =
  | 'purple_blue' | 'deep_space' | 'neon_cyber' | 'warm_sunset'
  | 'gold_white' | 'monochrome' | 'custom';

export type PerformanceTarget = 'mobile_safe' | 'desktop_balanced' | 'high_quality';

export interface ShaderSpec {
  intent: 'create' | 'modify' | 'fix' | 'explain' | 'optimize';

  scene: {
    type: SceneType;
    subject?: string;
    composition: Composition;
  };

  style: {
    mood: Mood;
    visualDensity: number;   // 0-1
    contrast: number;        // 0-1
    glow: number;            // 0-1
  };

  motion: {
    type: MotionType;
    speed: number;           // 0-1
    smoothness: number;      // 0-1
  };

  color: {
    palette: Palette;
    colors?: string[];
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
}
