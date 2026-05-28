export interface ShaderTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basics' | 'effects' | 'noise' | 'raymarching' | 'art';
  code: string;
}

export const SHADER_TEMPLATES: ShaderTemplate[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Basic UV gradient with time animation',
    category: 'basics',
    code: `// Starter Template - UV Gradient
// A simple shader that animates colors based on UV coordinates and time

precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalize pixel coordinates to 0-1 range
  vec2 uv = fragCoord / iResolution.xy;

  // Create time-varying color using cosine palette
  // The uv.xyx swizzle creates different color channels
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0.0, 2.0, 4.0));

  // Output the color with full opacity
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'plasma',
    name: 'Plasma',
    description: 'Classic plasma effect with sine waves',
    category: 'effects',
    code: `// Plasma Effect
// Creates flowing, organic patterns using layered sine waves

precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Scale UV to create more detail
  vec2 p = uv * 4.0 - 2.0;

  // Layer multiple sine waves for plasma effect
  float v = 0.0;
  v += sin(p.x + iTime);
  v += sin((p.y + iTime) * 0.5);
  v += sin((p.x + p.y + iTime) * 0.5);

  // Add circular pattern
  float cx = p.x + 0.5 * sin(iTime / 3.0);
  float cy = p.y + 0.5 * cos(iTime / 2.0);
  v += sin(sqrt(cx * cx + cy * cy + 1.0) + iTime);

  // Normalize to 0-1
  v *= 0.5;

  // Map to colorful palette
  vec3 col;
  col.r = sin(v * 3.14159);
  col.g = sin(v * 3.14159 + 2.094);
  col.b = sin(v * 3.14159 + 4.188);

  fragColor = vec4(col * 0.5 + 0.5, 1.0);
}`,
  },
  {
    id: 'fractal',
    name: 'Mandelbrot Fractal',
    description: 'Animated Mandelbrot set with zoom',
    category: 'art',
    code: `// Mandelbrot Fractal
// Explores the famous Mandelbrot set with animated zoom

precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Center and scale UV
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
  uv *= 2.0;

  // Animated center point
  vec2 c = vec2(-0.745, 0.186) + 0.1 * sin(iTime * 0.1);

  // Mandelbrot iteration
  vec2 z = uv;
  float iter = 0.0;
  const float maxIter = 100.0;

  for (float i = 0.0; i < maxIter; i++) {
    // z = z^2 + c
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

    // Check if escaped
    if (dot(z, z) > 4.0) break;
    iter++;
  }

  // Color based on iteration count
  float t = iter / maxIter;
  vec3 col = vec3(
    0.5 + 0.5 * cos(6.28 * t + 0.0),
    0.5 + 0.5 * cos(6.28 * t + 0.3),
    0.5 + 0.5 * cos(6.28 * t + 0.6)
  );

  // Black for points inside the set
  if (iter >= maxIter) col = vec3(0.0);

  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'voronoi',
    name: 'Voronoi Noise',
    description: 'Animated Voronoi/cellular noise pattern',
    category: 'noise',
    code: `// Voronoi Noise
// Creates organic cell-like patterns using distance fields

precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

// Hash function for random points
vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Scale for multiple cells
  uv *= 6.0;
  vec2 i_st = floor(uv);
  vec2 f_st = fract(uv);

  float min_dist = 1.0;
  vec2 min_point;

  // Check neighboring cells
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash(i_st + neighbor);

      // Animate the points
      point = 0.5 + 0.5 * sin(iTime + 6.28 * point);

      // Calculate distance
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);

      if (dist < min_dist) {
        min_dist = dist;
        min_point = point;
      }
    }
  }

  // Color based on cell ID and distance
  vec3 col = vec3(min_point, 0.5);
  col *= 1.0 - min_dist;

  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'raymarching',
    name: 'Raymarching Basics',
    description: 'Simple 3D sphere with lighting',
    category: 'raymarching',
    code: `// Raymarching Basics
// Renders a 3D sphere with smooth lighting using raymarching

precision mediump float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

// Signed distance function for a sphere
float sdSphere(vec3 p, float radius) {
  return length(p) - radius;
}

// Scene SDF - returns distance to nearest surface
float map(vec3 p) {
  // Animated sphere
  float sphere = sdSphere(p - vec3(0.0, 0.0, 0.0), 1.0);
  return sphere;
}

// Calculate surface normal from SDF
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // UV coordinates centered at origin
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  // Camera setup
  vec3 ro = vec3(0.0, 0.0, -3.0); // Ray origin
  vec3 rd = normalize(vec3(uv, 1.5)); // Ray direction

  // Raymarching loop
  float t = 0.0;
  for (int i = 0; i < 100; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.001) break; // Hit!
    if (t > 20.0) break;  // Miss
    t += d;
  }

  // Shading
  vec3 col = vec3(0.0);

  if (t < 20.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);

    // Simple lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);

    // Ambient + diffuse + specular
    col = vec3(0.1) + vec3(0.6, 0.2, 0.3) * diff + vec3(1.0) * spec * 0.5;
  }

  // Gamma correction
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'lighting',
    name: 'Simple Lighting',
    description: '2D shapes with dynamic lighting',
    category: 'basics',
    code: `// Simple Lighting
// Demonstrates 2D distance fields with animated lighting

precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

// 2D circle SDF
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// 2D box SDF
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Center UV coordinates
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  // Animated circle position
  vec2 circlePos = vec2(sin(iTime) * 0.5, cos(iTime * 0.7) * 0.3);
  float circle = sdCircle(uv - circlePos, 0.2);

  // Static box
  float box = sdBox(uv, vec2(0.15, 0.3));

  // Combine with smooth union
  float d = min(circle, box);

  // Light position (animated)
  vec2 lightPos = vec2(cos(iTime * 0.5) * 0.8, sin(iTime * 0.3) * 0.6);
  float lightDist = length(uv - lightPos);

  // Calculate lighting
  float light = 0.02 / (lightDist * lightDist); // Inverse square falloff
  light *= smoothstep(0.01, 0.0, d); // Only on surfaces

  // Edge glow
  float edge = 1.0 - smoothstep(0.0, 0.01, abs(d));
  edge *= 0.5 + 0.5 * sin(iTime * 3.0);

  // Background color
  vec3 col = vec3(0.05, 0.05, 0.1);

  // Add light
  col += vec3(1.0, 0.8, 0.6) * light;

  // Add edge glow
  col += vec3(0.3, 0.6, 1.0) * edge;

  // Surface color
  if (d < 0.0) {
    col = vec3(0.2, 0.3, 0.4);
    col += vec3(1.0, 0.8, 0.6) * light * 0.5;
  }

  fragColor = vec4(col, 1.0);
}`,
  },
];

export function getTemplatesByCategory(category: ShaderTemplate['category']): ShaderTemplate[] {
  return SHADER_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): ShaderTemplate | undefined {
  return SHADER_TEMPLATES.find((t) => t.id === id);
}
