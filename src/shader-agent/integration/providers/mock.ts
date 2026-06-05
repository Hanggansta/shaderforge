/**
 * Mock AI Provider — a no-LLM fallback for development and tests.
 *
 * The Mock provider can synthesize:
 *   - Intent classification (auto mode)
 *   - A ShaderSpec JSON for prompts (visual structurer fallback)
 *   - A handful of pre-built shaders keyed off keywords in the prompt
 *
 * The new shader-agent harness uses this for both mock-mode dev work and
 * the vitest pipeline. No src/ai/ dependency.
 */

import type { AIProvider, AIResponse, ShaderContext } from '../types/ai-provider';

const MOCK_DELAY = 300;

const MOCK_SHADERS: Record<string, string> = {
  plasma: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float v = 0.0;
  vec2 c = uv * 4.0 - 2.0;
  v += sin(c.x + iTime);
  v += sin((c.y + iTime) * 0.5);
  v += sin((c.x + c.y + iTime) * 0.5);
  c += vec2(sin(iTime * 0.33) * 0.5, cos(iTime * 0.5) * 0.5);
  v += sin(sqrt(c.x * c.x + c.y * c.y + 1.0) + iTime);
  v *= 0.5;
  vec3 col = vec3(
    sin(v * 3.14159),
    sin(v * 3.14159 + 2.094),
    sin(v * 3.14159 + 4.188)
  );
  fragColor = vec4(col * 0.5 + 0.5, 1.0);
}`,
  fractal: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
  uv *= 2.0;
  vec2 c = vec2(-0.745, 0.186) + 0.1 * sin(iTime * 0.1);
  vec2 z = uv;
  float iter = 0.0;
  const float maxIter = 100.0;
  for (float i = 0.0; i < maxIter; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
    iter++;
  }
  float t = iter / maxIter;
  vec3 col = vec3(
    0.5 + 0.5 * cos(6.28 * t + 0.0),
    0.5 + 0.5 * cos(6.28 * t + 0.3),
    0.5 + 0.5 * cos(6.28 * t + 0.6)
  );
  fragColor = vec4(col, 1.0);
}`,
  voronoi: `precision mediump float;

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  uv *= 6.0;
  vec2 i_st = floor(uv);
  vec2 f_st = fract(uv);
  float min_dist = 1.0;
  vec2 min_point;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash(i_st + neighbor);
      point = 0.5 + 0.5 * sin(iTime + 6.28 * point);
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);
      if (dist < min_dist) {
        min_dist = dist;
        min_point = point;
      }
    }
  }
  vec3 col = vec3(min_point, 0.5);
  col *= 1.0 - min_dist;
  fragColor = vec4(col, 1.0);
}`,
  default: `precision mediump float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float t = iTime * 0.5;
  float angle = atan(p.y, p.x) + t;
  float radius = length(p);
  float spiral = sin(angle * 3.0 + radius * 10.0 - t * 2.0);
  spiral = smoothstep(-0.2, 0.2, spiral);
  vec3 col = vec3(
    0.5 + 0.5 * cos(t + spiral * 0.5 + 0.0),
    0.5 + 0.5 * cos(t + spiral * 0.5 + 2.094),
    0.5 + 0.5 * cos(t + spiral * 0.5 + 4.188)
  );
  float vig = 1.0 - 0.3 * dot(uv - 0.5, uv - 0.5);
  col *= vig;
  fragColor = vec4(col, 1.0);
}`,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function selectMockShader(prompt: string, systemPrompt?: string): string {
  const lower = prompt.toLowerCase();
  const sysLower = (systemPrompt || '').toLowerCase();

  const userRequestMatch = lower.match(/user request:\s*(.+)$/m);
  const userRequest = userRequestMatch ? userRequestMatch[1] : lower;
  const combined = userRequest + ' ' + sysLower;

  if (sysLower.includes('scene type: "sphere"') || sysLower.includes('base technique: raymarching')) return generateSphereShader();
  if (sysLower.includes('scene type: "nebula"') || sysLower.includes('base technique: fbm_nebula')) return generateNebulaShader();
  if (sysLower.includes('scene type: "particles"') || sysLower.includes('base technique: procedural_particles')) return generateParticleShader();
  if (sysLower.includes('scene type: "fire"') || sysLower.includes('base technique: fire_noise')) return generateWarmShader();
  if (sysLower.includes('scene type: "ocean"') || sysLower.includes('scene type: "liquid"') || sysLower.includes('base technique: liquid_waves')) return generateOceanShader();
  if (sysLower.includes('scene type: "tunnel"') || sysLower.includes('base technique: polar_tunnel')) return MOCK_SHADERS.plasma;
  if (sysLower.includes('scene type: "mandala"') || sysLower.includes('base technique: mandala_symmetry')) return MOCK_SHADERS.voronoi;
  if (sysLower.includes('scene type: "terrain"') || sysLower.includes('base technique: terrain_heightfield')) return generateOceanShader();

  if (userRequest.includes('sphere') || userRequest.includes('ball') || userRequest.includes('orb') || userRequest.includes('3d') || userRequest.includes('raymarch')) return generateSphereShader();
  if (userRequest.includes('nebula') || userRequest.includes('space') || userRequest.includes('purple')) return generateNebulaShader();
  if (userRequest.includes('neon') || userRequest.includes('cyber') || userRequest.includes('particle')) return generateParticleShader();
  if (userRequest.includes('warm') || userRequest.includes('fire') || userRequest.includes('liquid')) return generateWarmShader();
  if (userRequest.includes('ocean') || userRequest.includes('water') || userRequest.includes('wave') || userRequest.includes('aurora') || userRequest.includes('ribbon')) return generateOceanShader();

  if (userRequest.includes('plasma')) return MOCK_SHADERS.plasma;
  if (userRequest.includes('fractal') || userRequest.includes('mandelbrot')) return MOCK_SHADERS.fractal;
  if (userRequest.includes('voronoi')) return MOCK_SHADERS.voronoi;

  if (combined.includes('palette') && combined.includes('neon_cyber')) return MOCK_SHADERS.plasma;
  if (combined.includes('palette') && combined.includes('warm_fire')) return generateWarmShader();
  if (combined.includes('palette') && combined.includes('cool_ocean')) return generateOceanShader();
  if (combined.includes('scene') && combined.includes('space')) return generateNebulaShader();
  if (combined.includes('motion') && combined.includes('particle')) return generateParticleShader();

  return MOCK_SHADERS.default;
}

function generateNebulaShader(): string {
  return `precision mediump float;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.1;
  float n = fbm(uv * 3.0 + t);
  vec3 col = vec3(0.3, 0.1, 0.5) + 0.3 * vec3(n, n * 0.5, n * 0.8);
  col += 0.2 * sin(uv.y * 10.0 + t * 5.0);
  fragColor = vec4(col, 1.0);
}`;
}

function generateWarmShader(): string {
  return `precision mediump float;
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.3;
  float wave = sin(uv.x * 5.0 + t) * cos(uv.y * 3.0 + t * 0.7);
  wave += sin(uv.x * 8.0 - t * 1.2) * 0.5;
  vec3 col = vec3(0.8, 0.4, 0.1) + 0.3 * wave;
  col = mix(col, vec3(0.9, 0.6, 0.2), smoothstep(-0.5, 0.5, wave));
  fragColor = vec4(col, 1.0);
}`;
}

function generateOceanShader(): string {
  return `precision mediump float;
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.2;
  float wave = sin(uv.x * 6.0 + t * 2.0) * 0.3;
  wave += sin(uv.x * 10.0 - t * 1.5) * 0.2;
  wave += sin(uv.y * 4.0 + t) * 0.2;
  vec3 col = vec3(0.1, 0.3, 0.6) + 0.2 * wave;
  col = mix(col, vec3(0.2, 0.5, 0.8), smoothstep(-0.3, 0.3, wave));
  fragColor = vec4(col, 1.0);
}`;
}

function generateSphereShader(): string {
  return `precision mediump float;
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdPlane(vec3 p) { return p.y + 1.0; }
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float map(vec3 p) {
  float sphere = sdSphere(p - vec3(0.0, 0.0, 0.0), 1.0);
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
    vec3 lightDir = normalize(vec3(0.8, 1.0, -0.6));
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    vec3 baseColor = vec3(0.3, 0.5, 0.9);
    col = baseColor * (0.2 + 0.6 * diff) + vec3(1.0) * spec * 0.5 + vec3(0.4, 0.6, 1.0) * fres * 0.3;
  }
  col = pow(col, vec3(0.4545));
  fragColor = vec4(col, 1.0);
}`;
}

function generateParticleShader(): string {
  return `precision mediump float;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.5;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 20; i++) {
    vec2 pos = vec2(hash(vec2(float(i), 0.0)), hash(vec2(0.0, float(i))));
    pos.y = fract(pos.y + t * 0.1);
    float d = length(uv - pos);
    float brightness = smoothstep(0.05, 0.0, d);
    col += brightness * vec3(0.2, 0.5, 1.0);
  }
  fragColor = vec4(col, 1.0);
}`;
}

export class MockAIProvider implements AIProvider {
  name = 'Mock AI';
  private configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  configure(_config: Record<string, string>): void {
    this.configured = true;
  }

  async generateShader(prompt: string, _context?: ShaderContext): Promise<AIResponse> {
    await delay(MOCK_DELAY);
    const code = selectMockShader(prompt);
    return {
      code,
      explanation: 'Generated a shader based on your prompt. This creates an animated visual effect using time-based coordinates.',
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async modifyShader(prompt: string, currentCode: string, _context?: ShaderContext): Promise<AIResponse> {
    await delay(MOCK_DELAY);
    const modified = currentCode.replace(
      'void mainImage',
      `// Modified: ${prompt}\nvoid mainImage`,
    );
    return {
      code: modified,
      explanation: `Modified the shader according to: "${prompt}"`,
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async fixShader(_currentCode: string, errorOutput: string, _context?: ShaderContext): Promise<AIResponse> {
    await delay(MOCK_DELAY);
    return {
      code: MOCK_SHADERS.default,
      explanation: `Analyzed the error: ${errorOutput.split('\n')[0]}. Applied a default shader as fix.`,
      warnings: ['This is a mock fix - please review the code manually'],
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async explainShader(_currentCode: string, _context?: ShaderContext): Promise<AIResponse> {
    await delay(MOCK_DELAY);
    return {
      explanation: 'This shader creates a visual effect by normalizing pixel coordinates to UV space (0-1 range), then using trigonometric functions with iTime to create animated patterns.',
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async generateWithMessages(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    await delay(MOCK_DELAY);
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const userMessage = messages.find((m) => m.role === 'user')?.content || '';
    const code = selectMockShader(userMessage, systemMessage);
    return {
      code,
      explanation: 'Generated a shader based on your prompt. This creates an animated visual effect using time-based coordinates.',
      warnings: ['Using Mock AI — configure a real provider in Settings for AI-powered generation'],
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async fixWithMessages(_currentCode: string, _messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    await delay(MOCK_DELAY);
    return {
      code: MOCK_SHADERS.default,
      explanation: 'Applied a fix based on the error analysis.',
      warnings: ['This is a mock fix - please review the code manually'],
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async generateCandidates(messages: Array<{ role: string; content: string }>, n: number): Promise<AIResponse[]> {
    await delay(MOCK_DELAY);
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const userMessage = messages.find((m) => m.role === 'user')?.content || '';
    const primaryCode = selectMockShader(userMessage, systemMessage);

    const allShaders = [
      MOCK_SHADERS.plasma,
      MOCK_SHADERS.fractal,
      MOCK_SHADERS.voronoi,
      MOCK_SHADERS.default,
      generateNebulaShader(),
      generateWarmShader(),
      generateOceanShader(),
      generateSphereShader(),
      generateParticleShader(),
    ];

    const alternatives = allShaders.filter((s) => s !== primaryCode);
    const shuffled = alternatives.sort(() => Math.random() - 0.5);
    const extras = shuffled.slice(0, n - 1);

    const results: AIResponse[] = [
      { code: primaryCode, providerName: this.name, model: 'mock-v1' },
      ...extras.map((code) => ({ code, providerName: this.name, model: 'mock-v1' })),
    ];

    while (results.length < n) {
      results.push({ code: primaryCode, providerName: this.name, model: 'mock-v1' });
    }

    return results.slice(0, n);
  }

  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    await delay(100);
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    if (systemMsg.includes('intent classifier')) return this.classifyIntent(messages);
    if (systemMsg.includes('ShaderSpec') || systemMsg.includes('visual intent')) return this.parseShaderSpec(messages);
    return this.parseShaderSpec(messages);
  }

  private classifyIntent(messages: Array<{ role: string; content: string }>): string {
    const userMsg = messages.find((m) => m.role === 'user')?.content?.toLowerCase() || '';
    if (userMsg.includes('fix') || userMsg.includes('error') || userMsg.includes('broken')) {
      return JSON.stringify({ intent: 'fix', confidence: 0.9, reason: 'User wants to fix errors' });
    }
    if (userMsg.includes('explain') || userMsg.includes('what does') || userMsg.includes('how does')) {
      return JSON.stringify({ intent: 'explain', confidence: 0.9, reason: 'User wants explanation' });
    }
    if (userMsg.includes('optimize') || userMsg.includes('performance') || userMsg.includes('faster')) {
      return JSON.stringify({ intent: 'optimize', confidence: 0.9, reason: 'User wants optimization' });
    }
    if (userMsg.includes('modify') || userMsg.includes('change') || userMsg.includes('adjust') ||
        userMsg.includes('make it') || userMsg.includes('slower') || userMsg.includes('brighter')) {
      return JSON.stringify({ intent: 'modify', confidence: 0.9, reason: 'User wants to modify existing shader' });
    }
    return JSON.stringify({ intent: 'create', confidence: 0.8, reason: 'User wants to create a new shader' });
  }

  private parseShaderSpec(messages: Array<{ role: string; content: string }>): string {
    const userMsg = messages.find((m) => m.role === 'user')?.content?.toLowerCase() || '';

    let palette = 'purple_blue';
    if (userMsg.includes('neon') || userMsg.includes('cyber')) palette = 'neon_cyber';
    else if (userMsg.includes('warm') || userMsg.includes('fire') || userMsg.includes('orange')) palette = 'warm_fire';
    else if (userMsg.includes('cool') || userMsg.includes('ocean') || userMsg.includes('blue')) palette = 'cool_ocean';
    else if (userMsg.includes('green') || userMsg.includes('nature')) palette = 'green_nature';
    else if (userMsg.includes('monochrome') || userMsg.includes('black') || userMsg.includes('white')) palette = 'monochrome';

    let mood = 'dreamy';
    if (userMsg.includes('intense') || userMsg.includes('energetic')) mood = 'intense';
    else if (userMsg.includes('calm') || userMsg.includes('peaceful') || userMsg.includes('gentle')) mood = 'calm';
    else if (userMsg.includes('dark') || userMsg.includes('moody')) mood = 'dark';

    let motionType = 'flow';
    if (userMsg.includes('particle') || userMsg.includes('dot')) motionType = 'particle';
    else if (userMsg.includes('wave') || userMsg.includes('ripple')) motionType = 'wave';
    else if (userMsg.includes('pulse') || userMsg.includes('beat')) motionType = 'pulse';
    else if (userMsg.includes('spiral') || userMsg.includes('vortex')) motionType = 'spiral';

    let sceneType = 'abstract';
    let allowRaymarching = false;
    if (userMsg.includes('sphere') || userMsg.includes('ball') || userMsg.includes('orb') || userMsg.includes('3d') || userMsg.includes('raymarch') || userMsg.includes('cube') || userMsg.includes('box')) {
      sceneType = 'sphere';
      allowRaymarching = true;
    } else if (userMsg.includes('nebula') || userMsg.includes('space') || userMsg.includes('star')) sceneType = 'space';
    else if (userMsg.includes('ocean') || userMsg.includes('water') || userMsg.includes('wave')) sceneType = 'water';
    else if (userMsg.includes('landscape') || userMsg.includes('mountain')) sceneType = 'landscape';

    return JSON.stringify({
      intent: 'create',
      scene: { type: sceneType, composition: 'fullscreen' },
      style: { mood },
      motion: { type: motionType },
      color: { palette },
      constraints: {
        target: 'webgl2',
        performance: 'desktop_balanced',
        maxIterations: allowRaymarching ? 64 : 32,
        allowRaymarching,
        allowTextures: false,
      },
    });
  }
}
