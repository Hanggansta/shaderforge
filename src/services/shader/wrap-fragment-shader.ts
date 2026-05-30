// Vertex shader for fullscreen quad
export const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Clean up common AI-generated issues
export function cleanShaderCode(code: string): string {
  let cleaned = code;

  // Remove #version directives (we add our own)
  cleaned = cleaned.replace(/^\s*#version\s+\d+\s+\w+\s*;?\s*$/gm, '');

  // Remove #ifdef GL_ES / #endif blocks
  cleaned = cleaned.replace(/#ifdef\s+GL_ES[\s\S]*?#endif/g, '');

  // Remove redundant precision declarations (we add our own)
  cleaned = cleaned.replace(/^\s*precision\s+\w+\s+\w+\s*;\s*$/gm, '');

  // Remove redundant uniform declarations (we add our own)
  cleaned = cleaned.replace(/^\s*uniform\s+(float|int|vec[234]|mat[234])\s+i\w+\s*;\s*$/gm, '');

  // Clean up multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// Wrapper for Shadertoy-style mainImage
export function wrapFragmentShader(userCode: string): string {
  const cleaned = cleanShaderCode(userCode);

  // Check if code already has mainImage
  if (cleaned.includes('mainImage')) {
    return `#version 300 es
precision mediump float;

// Auto-provided uniforms
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform vec4 iDate;

// User code
${cleaned}

// Auto-generated main function
out vec4 fragColor;
void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}`;
  }

  // If code has main(), use it directly
  if (cleaned.includes('void main()')) {
    return `#version 300 es
precision mediump float;

// Auto-provided uniforms
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform vec4 iDate;

// User code
${cleaned}`;
  }

  throw new Error('No mainImage() or main() function found');
}
