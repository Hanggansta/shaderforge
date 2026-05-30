import type { AIProvider, AIResponse, ShaderContext } from '../adapter';

const MOCK_DELAY = 1500; // Simulate network delay

const MOCK_SHADERS: Record<string, string> = {
  plasma: `precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Plasma effect
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

uniform float iTime;
uniform vec2 iResolution;

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

uniform float iTime;
uniform vec2 iResolution;

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

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalized pixel coordinates
  vec2 uv = fragCoord / iResolution.xy;

  // Center and aspect correct
  vec2 p = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

  // Animation
  float t = iTime * 0.5;

  // Create pattern
  float angle = atan(p.y, p.x) + t;
  float radius = length(p);

  // Spiral pattern
  float spiral = sin(angle * 3.0 + radius * 10.0 - t * 2.0);
  spiral = smoothstep(-0.2, 0.2, spiral);

  // Color palette
  vec3 col = vec3(
    0.5 + 0.5 * cos(t + spiral + vec3(0.0, 0.8, 1.6)),
    0.5 + 0.5 * sin(t + spiral + vec3(0.4, 1.2, 2.0))
  );

  // Vignette
  float vig = 1.0 - 0.3 * dot(uv - 0.5, uv - 0.5);
  col *= vig;

  fragColor = vec4(col, 1.0);
}`,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function selectMockShader(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('plasma')) return MOCK_SHADERS.plasma;
  if (lower.includes('fractal') || lower.includes('mandelbrot')) return MOCK_SHADERS.fractal;
  if (lower.includes('voronoi') || lower.includes('noise')) return MOCK_SHADERS.voronoi;
  return MOCK_SHADERS.default;
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
      explanation: `Generated a shader based on your prompt: "${prompt}". This creates an animated visual effect using time-based coordinates.`,
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async modifyShader(prompt: string, currentCode: string, _context?: ShaderContext): Promise<AIResponse> {
    await delay(MOCK_DELAY);

    // Simple mock: add a comment and return modified code
    const modified = currentCode.replace(
      'void mainImage',
      `// Modified: ${prompt}\nvoid mainImage`
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
      code: _currentCode,
      explanation: `Analyzed the error: ${errorOutput.split('\n')[0]}. The issue appears to be a syntax error. Please check the line indicated in the error.`,
      warnings: ['This is a mock fix - please review the code manually'],
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async explainShader(_currentCode: string, _context?: ShaderContext): Promise<AIResponse> {
    await delay(MOCK_DELAY);

    return {
      explanation: `This shader creates a visual effect by normalizing pixel coordinates to UV space (0-1 range), then using trigonometric functions with iTime to create animated patterns. The mainImage function receives the output color (fragColor) and pixel coordinates (fragCoord).`,
      providerName: this.name,
      model: 'mock-v1',
    };
  }

  async chatCompletion(_messages: Array<{ role: string; content: string }>): Promise<string> {
    await delay(500);

    // Return a default ShaderSpec JSON for the mock provider
    return JSON.stringify({
      intent: 'create',
      scene: { type: 'abstract', composition: 'fullscreen' },
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
    });
  }
}
