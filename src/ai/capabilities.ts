/**
 * Renderer Capability Profile
 * Defines what the WebGL2 renderer supports.
 * Used by: AI system prompt, validator, templates, UI
 */

export interface RendererCapabilities {
  // WebGL version
  webglVersion: 2;
  glslVersion: '300 es';

  // Shader entry point
  entryPoint: {
    function: 'mainImage';
    signature: 'void mainImage(out vec4 fragColor, in vec2 fragCoord)';
    note: 'mainImage uses out parameter - this is the ONE exception';
  };

  // Auto-provided uniforms (user should NOT declare these)
  autoUniforms: {
    name: string;
    type: string;
    description: string;
  }[];

  // Supported features
  features: {
    textures: false;           // No iChannel/sampler2D support
    multipass: false;          // No buffer A-D
    audio: false;              // No audio input
    video: false;              // No video/webcam
    computeShaders: false;     // No compute shaders
    geometryShaders: false;    // No geometry shaders
  };

  // Preprocessor rules
  preprocessor: {
    versionDirective: 'auto-added';  // We add #version 300 es automatically
    define: 'simple-constants-only'; // Allow #define FOO 1.0, not complex macros
    ifdef: 'discouraged';            // Don't use unless necessary
    pragma: 'not-supported';
  };

  // Known limitations
  limitations: string[];

  // Built-in functions that MUST NOT be redefined
  builtInFunctions: string[];
}

// The actual capability profile for our renderer
export const RENDERER_CAPABILITIES: RendererCapabilities = {
  webglVersion: 2,
  glslVersion: '300 es',

  entryPoint: {
    function: 'mainImage',
    signature: 'void mainImage(out vec4 fragColor, in vec2 fragCoord)',
    note: 'mainImage uses out parameter - this is the ONE exception',
  },

  autoUniforms: [
    { name: 'iTime', type: 'float', description: 'Elapsed time in seconds' },
    { name: 'iTimeDelta', type: 'float', description: 'Time since last frame' },
    { name: 'iFrame', type: 'int', description: 'Frame counter' },
    { name: 'iResolution', type: 'vec3', description: 'Viewport resolution (width, height, pixelRatio)' },
    { name: 'iMouse', type: 'vec4', description: 'Mouse coords (currentX, currentY, clickX, clickY)' },
    { name: 'iDate', type: 'vec4', description: 'Date (year, month, day, seconds)' },
  ],

  features: {
    textures: false,
    multipass: false,
    audio: false,
    video: false,
    computeShaders: false,
    geometryShaders: false,
  },

  preprocessor: {
    versionDirective: 'auto-added',
    define: 'simple-constants-only',
    ifdef: 'discouraged',
    pragma: 'not-supported',
  },

  limitations: [
    'No texture/sampler2D support (use math-based patterns instead)',
    'No multipass rendering (single pass only)',
    'No audio/video input',
    'Array indexing must be with constants or loop variables',
    'No function overloading',
    'No variable-length arrays',
  ],

  builtInFunctions: [
    // Trigonometry
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    // Exponential
    'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
    // Common
    'abs', 'sign', 'floor', 'ceil', 'fract', 'mod',
    'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
    // Geometric
    'length', 'distance', 'dot', 'cross', 'normalize',
    'faceforward', 'reflect', 'refract',
    // Matrix
    'matrixCompMult',
    // Vector relational
    'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
    'equal', 'notEqual', 'any', 'all', 'not',
    // Derivatives
    'dFdx', 'dFdy', 'fwidth',
  ],
};

// Generate a summary for AI system prompt
export function getCapabilitiesSummary(): string {
  const cap = RENDERER_CAPABILITIES;

  const uniformList = cap.autoUniforms
    .map(u => `  - ${u.name} (${u.type}): ${u.description}`)
    .join('\n');

  return `RENDERER CAPABILITIES:
- WebGL ${cap.webglVersion}, GLSL ES ${cap.glslVersion}
- Entry point: ${cap.entryPoint.signature}
- ${cap.entryPoint.note}

AUTO-PROVIDED UNIFORMS (do NOT declare these):
${uniformList}

UNSUPPORTED FEATURES:
${cap.limitations.map(l => `  - ${l}`).join('\n')}

PREPROCESSOR RULES:
- #version: automatically added, do NOT include
- #define: allowed for simple constants only (e.g., #define PI 3.14159)
- #ifdef/#ifndef: discouraged, avoid if possible
- #pragma: not supported`;
}
