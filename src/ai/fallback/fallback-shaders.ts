/**
 * Fallback Shaders
 * Safe, minimal shaders used when AI generation fails.
 * All examples are compatible with the WebGL2 renderer.
 */

import type { SceneType } from '../spec/shader-spec';
import type { BaseTechnique } from '../planner/technique-plan';

export interface FallbackShader {
  id: string;
  sceneTypes: SceneType[];
  baseTechniques: BaseTechnique[];
  code: string;
}

export const FALLBACK_SHADERS: FallbackShader[] = [
  {
    id: 'fallback-abstract-gradient',
    sceneTypes: ['abstract', 'unknown'],
    baseTechniques: ['gradient_field', 'abstract_flow'],
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.2;
  vec3 col = 0.5 + 0.5 * cos(6.28318 * (uv.xyx + t + vec3(0.0, 0.1, 0.2)));
  col *= smoothstep(0.0, 0.4, uv.y) * smoothstep(1.0, 0.6, uv.y);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'fallback-nebula',
    sceneTypes: ['nebula'],
    baseTechniques: ['fbm_nebula'],
    code: `precision mediump float;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.1;
  float f = fbm(uv * 3.0 + t);
  vec3 col = mix(vec3(0.05, 0.0, 0.15), vec3(0.4, 0.1, 0.6), f);
  col = mix(col, vec3(0.1, 0.7, 0.9), f * f * 0.5);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'fallback-particles',
    sceneTypes: ['particles'],
    baseTechniques: ['procedural_particles'],
    code: `precision mediump float;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 30; i++) {
    float fi = float(i);
    vec2 seed = vec2(fi * 0.137, fi * 0.371);
    vec2 pos = vec2(hash(seed), hash(seed + 0.5));
    pos.y = fract(pos.y + iTime * 0.06);
    float d = length(uv - pos);
    col += 0.002 / (d * d + 0.001) * (0.5 + 0.5 * cos(6.28 * fi * 0.1 + vec3(0.0, 0.33, 0.67)));
  }
  fragColor = vec4(col * 0.3, 1.0);
}`,
  },
  {
    id: 'fallback-liquid',
    sceneTypes: ['liquid', 'ocean'],
    baseTechniques: ['liquid_waves'],
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.3;
  float w = sin(uv.x * 6.0 + t) * 0.3 + sin(uv.y * 4.0 - t * 0.7) * 0.3;
  w += sin((uv.x + uv.y) * 5.0 + t * 0.5) * 0.2;
  w = w * 0.5 + 0.5;
  vec3 col = mix(vec3(0.05, 0.05, 0.15), vec3(0.3, 0.5, 0.8), w);
  col = mix(col, vec3(0.8, 0.9, 1.0), pow(w, 4.0) * 0.3);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'fallback-fire',
    sceneTypes: ['fire'],
    baseTechniques: ['fire_noise'],
    code: `precision mediump float;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = uv * vec2(3.0, 5.0);
  p.y -= iTime * 0.8;
  float f = noise(p) * 0.6 + noise(p * 2.0) * 0.3;
  f *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.3, uv.y);
  f *= 1.0 - uv.y * 0.5;
  vec3 col = mix(vec3(0.05, 0.0, 0.0), vec3(1.0, 0.4, 0.0), f);
  col = mix(col, vec3(1.0, 0.9, 0.2), pow(f, 3.0));
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'fallback-tunnel',
    sceneTypes: ['tunnel'],
    baseTechniques: ['polar_tunnel'],
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  float t = iTime * 0.4;
  float ring = sin(radius * 15.0 - t * 2.0) * 0.5 + 0.5;
  float spoke = sin(angle * 4.0 + t) * 0.5 + 0.5;
  float glow = 0.015 / (radius + 0.015);
  vec3 col = vec3(0.0, 0.8, 1.0) * glow * ring * spoke;
  col += vec3(0.0, 0.2, 0.4) * glow * 0.1;
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'fallback-mandala',
    sceneTypes: ['mandala'],
    baseTechniques: ['mandala_symmetry'],
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  float t = iTime * 0.3;
  float a = mod(angle, 0.785398) - 0.392699;
  float r = abs(a) * radius;
  float pattern = sin(r * 12.0 - t * 2.0) * 0.5 + 0.5;
  pattern *= sin(angle * 8.0 + t) * 0.3 + 0.7;
  vec3 col = mix(vec3(0.05, 0.0, 0.1), vec3(0.5, 0.2, 0.8), pattern);
  col *= smoothstep(0.7, 0.2, radius);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'fallback-minimal',
    sceneTypes: ['abstract', 'unknown'],
    baseTechniques: ['gradient_field', 'abstract_flow'],
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float v = sin(uv.x * 3.14159 + iTime * 0.1) * sin(uv.y * 3.14159 - iTime * 0.07);
  v = v * 0.5 + 0.5;
  v = smoothstep(0.3, 0.7, v);
  vec3 col = vec3(v * 0.12 + 0.04);
  fragColor = vec4(col, 1.0);
}`,
  },
];
