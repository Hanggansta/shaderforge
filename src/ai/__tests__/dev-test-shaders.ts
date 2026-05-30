/**
 * Dev-only test shader presets for verifying telemetry and auto-repair.
 * Used by the dev test harness to inject known shader code without live AI generation.
 */

import type { ShaderSpec } from '../spec/shader-spec';
import type { TechniquePlan } from '../planner/technique-plan';

export interface TestShaderPreset {
  id: string;
  label: string;
  code: string;
  spec: ShaderSpec;
  plan: TechniquePlan;
}

const BASE_SPEC: ShaderSpec = {
  intent: 'create',
  scene: { type: 'abstract', composition: 'fullscreen' },
  style: { mood: 'minimal', visualDensity: 0.5, contrast: 0.5, glow: 0.5 },
  motion: { type: 'static', speed: 0.5, smoothness: 0.5 },
  color: { palette: 'custom' },
  constraints: { target: 'webgl2', performance: 'desktop_balanced', maxIterations: 32, allowRaymarching: false, allowTextures: false },
};

const BASE_PLAN: TechniquePlan = {
  baseTechnique: 'abstract_flow',
  coordinateSystem: 'centered_uv',
  noise: 'fbm',
  motion: 'static',
  colorMethod: 'monochrome_ramp',
  effects: [],
  composition: 'fullscreen_texture',
  performance: 'desktop_balanced',
  maxLoopBudget: 32,
  avoid: [],
  promptHints: [],
};

export const TEST_SHADERS: TestShaderPreset[] = [
  {
    id: 'black-screen',
    label: 'Black Screen (too_dark)',
    code: `precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}`,
    spec: {
      ...BASE_SPEC,
      scene: { type: 'abstract', subject: 'vibrant colorful nebula', composition: 'fullscreen' },
      style: { mood: 'energetic', visualDensity: 0.7, contrast: 0.7, glow: 0.8 },
      motion: { type: 'flow', speed: 0.5, smoothness: 0.8 },
      color: { palette: 'neon_cyber' },
    },
    plan: { ...BASE_PLAN, motion: 'time_drift', colorMethod: 'palette_gradient', effects: ['soft_glow', 'bloom_like'] },
  },
  {
    id: 'low-contrast-gray',
    label: 'Low Contrast Gray (low_contrast)',
    code: `precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  // Very narrow range around 0.5 — low contrast
  float v = 0.48 + 0.04 * sin(uv.x * 3.14);
  fragColor = vec4(v, v, v, 1.0);
}`,
    spec: {
      ...BASE_SPEC,
      scene: { type: 'abstract', subject: 'colorful geometric patterns', composition: 'fullscreen' },
      style: { mood: 'cyberpunk', visualDensity: 0.6, contrast: 0.7, glow: 0.5 },
      motion: { type: 'flow', speed: 0.3, smoothness: 0.7 },
      color: { palette: 'neon_cyber' },
    },
    plan: { ...BASE_PLAN, motion: 'time_drift', colorMethod: 'neon_ramp', effects: ['soft_glow'] },
  },
  {
    id: 'flickering',
    label: 'Flickering (excessive_flicker)',
    code: `precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  // Rapid alternation between bright and dark
  float flash = step(0.5, fract(iTime * 15.0));
  vec3 col = mix(vec3(0.05), vec3(1.0), flash);
  col *= 0.5 + 0.5 * sin(uv.y * 10.0 + iTime * 5.0);
  fragColor = vec4(col, 1.0);
}`,
    spec: {
      ...BASE_SPEC,
      scene: { type: 'abstract', subject: 'strobing light', composition: 'fullscreen' },
      style: { mood: 'energetic', visualDensity: 0.6, contrast: 0.9, glow: 0.8 },
      motion: { type: 'pulse', speed: 0.9, smoothness: 0.1 },
    },
    plan: { ...BASE_PLAN, motion: 'radial_pulse', colorMethod: 'monochrome_ramp' },
  },
  {
    id: 'normal-colorful',
    label: 'Normal Colorful (healthy)',
    code: `precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0.0, 2.0, 4.0));
  col *= 0.8 + 0.2 * sin(uv.y * 6.28 + iTime);
  fragColor = vec4(col, 1.0);
}`,
    spec: {
      ...BASE_SPEC,
      scene: { type: 'abstract', subject: 'rainbow gradients', composition: 'fullscreen' },
      style: { mood: 'energetic', visualDensity: 0.5, contrast: 0.5, glow: 0.5 },
      motion: { type: 'flow', speed: 0.5, smoothness: 0.8 },
      color: { palette: 'custom', colors: ['#FF0000', '#00FF00', '#0000FF'] },
    },
    plan: { ...BASE_PLAN, motion: 'time_drift', colorMethod: 'palette_gradient', effects: ['soft_glow'] },
  },
];
