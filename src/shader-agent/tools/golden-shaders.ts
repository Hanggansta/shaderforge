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
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
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
    id: 'raymarched-sphere',
    title: 'Raymarched Sphere with Lighting',
    sceneTypes: ['sphere', 'abstract'],
    baseTechniques: ['abstract_flow'],
    moods: ['premium', 'minimal'],
    palettes: ['purple_blue', 'monochrome'],
    performance: 'desktop_balanced',
    tags: ['sphere', 'raymarch', 'sdf', '3d', 'lighting'],
    notes: 'Simple raymarched sphere with diffuse + specular lighting and a ground plane.',
    code: `precision mediump float;
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdPlane(vec3 p) { return p.y + 1.0; }
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float map(vec3 p) {
  float sphere = sdSphere(p, 1.0);
  float plane = sdPlane(p);
  return smin(sphere, plane, 0.3);
}
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  vec3 ro = vec3(0.0, 1.0, -4.0);
  vec3 rd = normalize(vec3(uv, 1.5));
  float t = iTime * 0.3;
  float cs = cos(t), sn = sin(t);
  ro.xz = mat2(cs, -sn, sn, cs) * ro.xz;
  rd.xz = mat2(cs, -sn, sn, cs) * rd.xz;
  float d = 0.0; vec3 p;
  for (int i = 0; i < 64; i++) {
    p = ro + rd * d;
    float h = map(p);
    if (h < 0.001) break;
    d += h;
    if (d > 20.0) break;
  }
  vec3 col = vec3(0.05, 0.05, 0.1);
  if (d < 20.0) {
    vec3 n = calcNormal(p);
    vec3 ld = normalize(vec3(0.8, 1.0, -0.6));
    float diff = max(dot(n, ld), 0.0);
    float spec = pow(max(dot(reflect(-ld, n), -rd), 0.0), 32.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    vec3 base = 0.5 + 0.5 * cos(6.28318 * (dot(n, ld) * 0.5 + 0.5 + vec3(0.0, 0.1, 0.2)));
    col = base * (0.2 + 0.6 * diff) + vec3(1.0) * spec * 0.5 + vec3(0.4, 0.6, 1.0) * fres * 0.3;
  }
  col = pow(col, vec3(0.4545));
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'voronoi-cells',
    title: 'Voronoi Cell Pattern',
    sceneTypes: ['abstract', 'particles'],
    baseTechniques: ['procedural_particles', 'abstract_flow'],
    moods: ['cyberpunk', 'premium'],
    palettes: ['neon_cyber', 'deep_space'],
    performance: 'desktop_balanced',
    tags: ['voronoi', 'cells', 'geometric', 'organic'],
    notes: 'F1 Voronoi with animated cell centers. Uses vec2 hash, no fbm. Moderate GPU cost.',
    code: `precision mediump float;
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = uv * 5.0;
  vec2 n = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  vec2 minPoint = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 point = hash2(n + neighbor);
      point = 0.5 + 0.5 * sin(iTime * 0.5 + 6.28318 * point);
      vec2 diff = neighbor + point - f;
      float d = length(diff);
      if (d < minDist) { minDist = d; minPoint = point; }
    }
  }
  float edge = smoothstep(0.0, 0.05, minDist);
  vec3 cellColor = 0.5 + 0.5 * cos(6.28318 * (vec3(minPoint, 0.5) + vec3(0.0, 0.33, 0.67)));
  vec3 col = cellColor * edge;
  col += vec3(0.0, 0.8, 1.0) * (1.0 - edge) * 0.5;
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'domain-warped-organic',
    title: 'Domain Warped Organic',
    sceneTypes: ['nebula', 'abstract', 'liquid'],
    baseTechniques: ['fbm_nebula', 'abstract_flow'],
    moods: ['dreamy', 'organic'],
    palettes: ['purple_blue', 'warm_sunset'],
    performance: 'desktop_balanced',
    tags: ['domain-warp', 'fbm', 'organic', 'flowing'],
    notes: 'Triple domain warping with FBM. Creates organic, flowing distortions.',
    code: `precision mediump float;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = uv * 3.0;
  float t = iTime * 0.08;
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + q * 4.0 + vec2(1.7, 9.2) + t * 0.5), fbm(p + q * 4.0 + vec2(8.3, 2.8)));
  float f = fbm(p + r * 2.0);
  vec3 col = mix(vec3(0.1, 0.05, 0.2), vec3(0.8, 0.3, 0.1), f * f);
  col = mix(col, vec3(0.0, 0.5, 0.7), dot(q, q) * 0.3);
  col = mix(col, vec3(1.0, 0.9, 0.5), dot(r, r) * 0.2);
  col *= 0.8 + 0.4 * f;
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
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
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
];
