/**
 * Renderer Capability Profile
 *
 * Defines what the WebGL2 renderer supports. Used by prompt builders,
 * the validator, and the AI system prompt to keep code generation honest.
 */

export interface RendererCapabilities {
  webglVersion: 2;
  glslVersion: '300 es';

  entryPoint: {
    function: 'mainImage';
    signature: 'void mainImage(out vec4 fragColor, in vec2 fragCoord)';
    note: 'mainImage uses out parameter - this is the ONE exception';
  };

  autoUniforms: {
    name: string;
    type: string;
    description: string;
  }[];

  features: {
    textures: false;
    multipass: false;
    audio: false;
    video: false;
    computeShaders: false;
    geometryShaders: false;
  };

  preprocessor: {
    versionDirective: 'auto-added';
    define: 'simple-constants-only';
    ifdef: 'discouraged';
    pragma: 'not-supported';
  };

  limitations: string[];

  builtInFunctions: string[];
}

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
    textures: false, multipass: false, audio: false, video: false,
    computeShaders: false, geometryShaders: false,
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
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
    'abs', 'sign', 'floor', 'ceil', 'fract', 'mod',
    'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
    'length', 'distance', 'dot', 'cross', 'normalize',
    'faceforward', 'reflect', 'refract',
    'matrixCompMult',
    'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
    'equal', 'notEqual', 'any', 'all', 'not',
    'dFdx', 'dFdy', 'fwidth',
  ],
};

export function getCapabilitiesSummary(): string {
  const cap = RENDERER_CAPABILITIES;
  const uniformList = cap.autoUniforms
    .map((u) => `  - ${u.name} (${u.type}): ${u.description}`)
    .join('\n');

  return `RENDERER CAPABILITIES:
- WebGL ${cap.webglVersion}, GLSL ES ${cap.glslVersion}
- Entry point: ${cap.entryPoint.signature}
- ${cap.entryPoint.note}

AUTO-PROVIDED UNIFORMS (do NOT declare these):
${uniformList}

UNSUPPORTED FEATURES:
${cap.limitations.map((l) => `  - ${l}`).join('\n')}

PREPROCESSOR RULES:
- #version: automatically added, do NOT include
- #define: allowed for simple constants only (e.g., #define PI 3.14159)
- #ifdef/#ifndef: discouraged, avoid if possible
- #pragma: not supported`;
}
