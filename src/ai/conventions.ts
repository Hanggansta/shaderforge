/**
 * GLSL Conventions for AI Code Generation
 * Based on renderer capabilities, not templates.
 * Defines HOW to write valid GLSL, not WHAT to create.
 */

import { getCapabilitiesSummary } from './capabilities';

// Build the system prompt for AI
export function buildSystemPrompt(): string {
  return `You are a WebGL2 GLSL shader generator. Your goal is to create visually interesting, creative shaders that compile and run correctly.

${getCapabilitiesSummary()}

CODE STRUCTURE RULES:
1. Start with: precision mediump float;
2. Define structs BEFORE using them
3. Define helper functions BEFORE calling them
4. Declare variables BEFORE using them
5. mainImage is the entry point - it MUST exist

HELPER FUNCTION PATTERN:
Use return values for helper functions. This is more reliable than out parameters.

Example:
  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  vec3 getColor(vec3 position) {
    return vec3(1.0, 0.5, 0.2);
  }

Note: mainImage itself uses out parameter - this is the ONE allowed exception.

PREPROCESSOR RULES:
- #define is ALLOWED for simple constants: #define PI 3.14159, #define MAX_STEPS 100
- #define must be placed BEFORE any code that uses it (at the top of the file)
- Do NOT use #version directive (added automatically)
- Do NOT use #ifdef GL_ES (not needed)
- Do NOT use complex #define macros with parameters (keep it simple)

AVOID COMMON MISTAKES:
- Do NOT declare uniforms that are auto-provided (iTime, iResolution, etc.)
- Do NOT redefine built-in functions (reflect, normalize, length, etc.)
- Do NOT use iChannel or sampler2D (no texture support)

CREATIVE FREEDOM:
You can create ANY visual effect - generative art, simulations, fractals, noise patterns, raymarching, particle effects, abstract art, etc. The rules above are only for renderer compatibility, not creative constraints.

OUTPUT FORMAT:
- Output ONLY raw GLSL code
- NO markdown fences (no \`\`\`glsl)
- NO explanations before/after the code
- NO comments explaining what you're doing (put brief comments in the code if needed)
- Start directly with: precision mediump float;`;
}

// Build fix prompt when errors occur
export function buildFixPrompt(
  code: string,
  errors: Array<{ line: number; rawMessage: string; errorType: string; fixDirection: string }>
): string {
  const errorList = errors
    .map(e => `Line ${e.line}: [${e.errorType}] ${e.rawMessage}\n  Fix: ${e.fixDirection}`)
    .join('\n');

  return `The shader code has compilation errors. Fix ONLY these specific errors, do not rewrite the entire shader.

ERRORS:
${errorList}

CURRENT CODE:
${code}

FIX INSTRUCTIONS:
- "undeclared identifier": Add the missing variable/function/type definition before it's used
- "syntax error": Check for missing semicolons, braces, or incorrect syntax
- "dimension mismatch": Check vector types match (vec2, vec3, vec4)
- "cannot convert": Add explicit type conversion
- "redefining": Remove the custom definition of a built-in function
- "out/inout": Change helper function to use return value instead

Output the COMPLETE fixed shader code. Do not skip any parts.`;
}

// Build validation error prompt
export function buildValidationPrompt(
  code: string,
  issues: string[]
): string {
  const issueList = issues.map(i => `- ${i}`).join('\n');

  return `The shader code has structural issues that will prevent compilation.

ISSUES FOUND:
${issueList}

CURRENT CODE:
${code}

Fix these issues while keeping the rest of the code intact.
Output the COMPLETE fixed shader code.`;
}
