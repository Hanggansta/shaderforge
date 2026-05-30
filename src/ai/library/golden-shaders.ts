/**
 * Golden Shader Library
 * Curated reference examples for spec-aware GLSL generation.
 * All examples are original, safe, and compatible with the renderer.
 */

import type { GoldenShaderExample } from './golden-shader';

export const GOLDEN_SHADERS: GoldenShaderExample[] = [
  {
    id: 'abstract-gradient-field',
    title: 'Abstract Premium Gradient Field',
    sceneTypes: ['abstract', 'unknown'],
    baseTechniques: ['gradient_field', 'abstract_flow'],
    moods: ['premium', 'minimal', 'dreamy'],
    palettes: ['purple_blue', 'gold_white', 'monochrome'],
    performance: 'mobile_safe',
    tags: ['gradient', 'smooth', 'premium', 'simple'],
    notes: 'Cosine palette gradient with gentle time drift. Minimal GPU cost.',
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.15;
  vec3 col = 0.5 + 0.5 * cos(6.28318 * (uv.xyx * 0.8 + t + vec3(0.0, 0.1, 0.2)));
  col *= smoothstep(0.0, 0.5, uv.y) * smoothstep(1.0, 0.5, uv.y);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'dreamy-fbm-nebula',
    title: 'Dreamy FBM Nebula',
    sceneTypes: ['nebula', 'abstract'],
    baseTechniques: ['fbm_nebula', 'abstract_flow'],
    moods: ['dreamy', 'premium'],
    palettes: ['purple_blue', 'deep_space'],
    performance: 'desktop_balanced',
    tags: ['fbm', 'noise', 'nebula', 'organic'],
    notes: 'Domain-warped FBM with soft color palette. Moderate GPU cost.',
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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = uv * 3.0;
  float t = iTime * 0.1;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(1.0)));
  vec2 r = vec2(fbm(p + q * 2.0 + t), fbm(p + q * 2.0 + vec2(1.0)));
  float f = fbm(p + r * 1.5);
  vec3 col = mix(vec3(0.1, 0.05, 0.2), vec3(0.4, 0.1, 0.6), f);
  col = mix(col, vec3(0.1, 0.8, 0.9), dot(q, q) * 0.5);
  col *= 0.8 + 0.2 * f;
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'neon-procedural-particles',
    title: 'Neon Procedural Particles',
    sceneTypes: ['particles', 'abstract'],
    baseTechniques: ['procedural_particles'],
    moods: ['cyberpunk', 'energetic'],
    palettes: ['neon_cyber', 'deep_space'],
    performance: 'desktop_balanced',
    tags: ['particles', 'neon', 'glow', 'upward'],
    notes: 'Hash-based point particles with upward drift and glow. No textures.',
    code: `precision mediump float;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 40; i++) {
    float fi = float(i);
    vec2 seed = vec2(fi * 0.137, fi * 0.371);
    vec2 pos = vec2(hash(seed), hash(seed + 0.5));
    pos.y = fract(pos.y + iTime * (0.05 + hash(seed + 0.2) * 0.1));
    pos.x += sin(iTime * 0.5 + fi) * 0.05;
    float d = length(uv - pos);
    float brightness = 0.003 / (d * d + 0.001);
    vec3 pc = 0.5 + 0.5 * cos(6.28 * (vec3(fi * 0.03) + vec3(0.0, 0.33, 0.67)));
    col += pc * brightness * 0.02;
  }
  col = pow(col, vec3(0.9));
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'liquid-wave-field',
    title: 'Liquid Wave Field',
    sceneTypes: ['liquid', 'ocean', 'abstract'],
    baseTechniques: ['liquid_waves'],
    moods: ['organic', 'dreamy'],
    palettes: ['warm_sunset', 'purple_blue'],
    performance: 'mobile_safe',
    tags: ['waves', 'liquid', 'sine', 'flow'],
    notes: 'Layered sine waves with palette coloring. Very low GPU cost.',
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.3;
  float w = 0.0;
  w += sin(uv.x * 6.0 + t) * 0.3;
  w += sin(uv.y * 4.0 - t * 0.7) * 0.3;
  w += sin((uv.x + uv.y) * 5.0 + t * 0.5) * 0.2;
  w += sin(length(uv - 0.5) * 8.0 - t) * 0.2;
  w = w * 0.5 + 0.5;
  vec3 col = mix(vec3(0.1, 0.05, 0.15), vec3(0.9, 0.4, 0.2), w);
  col = mix(col, vec3(1.0, 0.8, 0.5), pow(w, 3.0) * 0.5);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'warm-fire-noise',
    title: 'Warm Fire Noise',
    sceneTypes: ['fire', 'abstract'],
    baseTechniques: ['fire_noise'],
    moods: ['energetic', 'organic'],
    palettes: ['warm_sunset', 'gold_white'],
    performance: 'mobile_safe',
    tags: ['fire', 'warm', 'upward', 'noise'],
    notes: 'Simplex-like upward noise with warm palette. Low GPU cost.',
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
  float t = iTime * 0.8;
  vec2 p = uv * vec2(3.0, 6.0);
  p.y -= t;
  float f = noise(p) * 0.6 + noise(p * 2.0) * 0.3 + noise(p * 4.0) * 0.1;
  f *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.4, uv.y);
  f *= 1.0 - uv.y * 0.5;
  vec3 col = mix(vec3(0.1, 0.0, 0.0), vec3(1.0, 0.5, 0.0), f);
  col = mix(col, vec3(1.0, 0.9, 0.3), pow(f, 3.0));
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'polar-neon-tunnel',
    title: 'Polar Neon Tunnel',
    sceneTypes: ['tunnel', 'abstract'],
    baseTechniques: ['polar_tunnel'],
    moods: ['cyberpunk', 'energetic'],
    palettes: ['neon_cyber', 'deep_space'],
    performance: 'desktop_balanced',
    tags: ['tunnel', 'polar', 'neon', 'pulse'],
    notes: 'Polar coordinate tunnel with radial pulse. Moderate GPU cost.',
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  float t = iTime * 0.5;
  float ring = sin(radius * 20.0 - t * 3.0) * 0.5 + 0.5;
  float spoke = sin(angle * 6.0 + t * 2.0) * 0.5 + 0.5;
  float pattern = ring * spoke;
  float glow = 0.02 / (radius + 0.02);
  vec3 neon = 0.5 + 0.5 * cos(6.28 * (vec3(pattern) + vec3(0.0, 0.33, 0.67)));
  vec3 col = neon * glow * pattern;
  col += vec3(0.0, 0.8, 1.0) * glow * 0.15;
  col = pow(col, vec3(1.2));
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'mandala-symmetry',
    title: 'Mandala Symmetry',
    sceneTypes: ['mandala', 'abstract'],
    baseTechniques: ['mandala_symmetry'],
    moods: ['premium', 'dreamy', 'minimal'],
    palettes: ['purple_blue', 'gold_white', 'monochrome'],
    performance: 'desktop_balanced',
    tags: ['mandala', 'polar', 'symmetry', 'pulse'],
    notes: 'Polar symmetry with radial pulse. Clean geometric pattern.',
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  float t = iTime * 0.3;
  float symmetry = 8.0;
  float a = mod(angle, 6.28318 / symmetry) - 0.5 * 6.28318 / symmetry;
  float r = abs(a) * radius;
  float pattern = sin(r * 15.0 - t * 2.0) * 0.5 + 0.5;
  pattern *= sin(angle * symmetry + t) * 0.3 + 0.7;
  float ring = smoothstep(0.0, 0.02, abs(sin(radius * 10.0 - t)) - 0.01);
  vec3 col = mix(vec3(0.05, 0.0, 0.1), vec3(0.6, 0.2, 0.8), pattern * ring);
  col = mix(col, vec3(1.0, 0.9, 0.6), pow(pattern, 4.0) * 0.3);
  col *= smoothstep(0.8, 0.2, radius);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'minimal-monochrome-field',
    title: 'Minimal Monochrome Field',
    sceneTypes: ['abstract', 'unknown'],
    baseTechniques: ['gradient_field', 'abstract_flow'],
    moods: ['minimal', 'premium'],
    palettes: ['monochrome'],
    performance: 'mobile_safe',
    tags: ['minimal', 'monochrome', 'clean', 'simple'],
    notes: 'Ultra-minimal monochrome gradient with subtle motion. Lowest GPU cost.',
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.1;
  float v = sin(uv.x * 3.14159 + t) * sin(uv.y * 3.14159 - t * 0.7);
  v = v * 0.5 + 0.5;
  v = smoothstep(0.2, 0.8, v);
  vec3 col = vec3(v * 0.15 + 0.05);
  col += vec3(0.02) * sin(uv.y * 50.0 + t * 5.0);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'ocean-waves',
    title: 'Ocean Wave Field',
    sceneTypes: ['ocean', 'liquid'],
    baseTechniques: ['liquid_waves'],
    moods: ['organic', 'dreamy'],
    palettes: ['deep_space', 'purple_blue'],
    performance: 'desktop_balanced',
    tags: ['ocean', 'waves', 'water', 'flow'],
    notes: 'Layered wave functions with depth-like coloring. Moderate GPU cost.',
    code: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.25;
  float w = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float freq = 1.0 + fi * 1.5;
    float speed = 0.5 + fi * 0.2;
    float amp = 0.4 / (1.0 + fi);
    w += sin(uv.x * freq + uv.y * 0.5 + t * speed) * amp;
  }
  w = w * 0.5 + 0.5;
  vec3 deep = vec3(0.02, 0.05, 0.15);
  vec3 shallow = vec3(0.1, 0.3, 0.5);
  vec3 foam = vec3(0.6, 0.8, 0.9);
  vec3 col = mix(deep, shallow, w);
  col = mix(col, foam, pow(w, 4.0) * 0.5);
  col += vec3(0.05, 0.1, 0.15) * sin(uv.y * 20.0 + t * 3.0) * 0.1;
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'terrain-heightfield',
    title: 'Terrain-like Heightfield',
    sceneTypes: ['terrain', 'abstract'],
    baseTechniques: ['terrain_heightfield'],
    moods: ['organic', 'premium'],
    palettes: ['warm_sunset', 'deep_space'],
    performance: 'desktop_balanced',
    tags: ['terrain', 'fbm', 'heightfield', 'layered'],
    notes: 'FBM-based pseudo-terrain with gradient sky. Moderate GPU cost.',
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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.05;
  float height = fbm(vec2(uv.x * 4.0 + t, 0.5)) * 0.6;
  float terrainLine = 0.3 + height;
  float isTerrain = smoothstep(terrainLine + 0.01, terrainLine - 0.01, uv.y);
  vec3 sky = mix(vec3(0.05, 0.02, 0.1), vec3(0.3, 0.1, 0.2), uv.y);
  vec3 ground = mix(vec3(0.1, 0.15, 0.1), vec3(0.3, 0.25, 0.15), height);
  ground *= 0.8 + 0.2 * fbm(uv * 8.0);
  vec3 col = mix(sky, ground, isTerrain);
  col += vec3(0.05, 0.02, 0.0) * (1.0 - uv.y) * 0.5;
  fragColor = vec4(col, 1.0);
}`,
  },
];
