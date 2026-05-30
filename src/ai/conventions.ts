/**
 * GLSL Conventions for AI Code Generation
 * Based on renderer capabilities, not templates.
 * Defines HOW to write valid GLSL, not WHAT to create.
 */

import { getCapabilitiesSummary } from './capabilities';
import type { ShaderSpec } from './spec/shader-spec';
import type { TechniquePlan } from './planner/technique-plan';
import type { GoldenShaderExample } from './library/golden-shader';
import type { ModifyStrategy } from './modify/modify-strategy';
import type { ModifyIntent } from './modify/modify-intent';

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

// Build spec-aware system prompt for GLSL generation
export function buildSpecAwareSystemPrompt(
  spec: ShaderSpec,
  plan?: TechniquePlan,
  goldenExamples?: GoldenShaderExample[],
  modifyStrategy?: ModifyStrategy,
  modifyIntent?: ModifyIntent,
): string {
  const base = buildSystemPrompt();

  const specInstructions = `
SHADER SPECIFICATION (OBEY THIS OVER VAGUE WORDING):
${JSON.stringify(spec, null, 2)}

SPEC RULES:
- Scene type "${spec.scene.type}": use visual patterns and techniques appropriate for this scene type${spec.scene.subject ? `\n- Subject: focus the visual on "${spec.scene.subject}"` : ''}
- Composition "${spec.scene.composition}": arrange the visual layout accordingly
- Mood "${spec.style.mood}": use color, contrast, and motion that evoke this mood
- Visual density ${spec.style.visualDensity}/1.0: ${spec.style.visualDensity < 0.3 ? 'keep it minimal and clean' : spec.style.visualDensity > 0.7 ? 'make it rich and detailed' : 'balanced level of detail'}
- Contrast ${spec.style.contrast}/1.0: ${spec.style.contrast < 0.3 ? 'soft, low contrast' : spec.style.contrast > 0.7 ? 'bold, high contrast' : 'moderate contrast'}
- Glow ${spec.style.glow}/1.0: ${spec.style.glow < 0.3 ? 'no glow/bloom effects' : spec.style.glow > 0.7 ? 'prominent glow and bloom' : 'subtle glow accents'}
- Motion "${spec.motion.type}" at speed ${spec.motion.speed}/1.0, smoothness ${spec.motion.smoothness}/1.0
- Color palette "${spec.color.palette}"${spec.color.colors ? ` with colors: ${spec.color.colors.join(', ')}` : ''}
- Performance target: ${spec.constraints.performance}
- Max iterations: ${spec.constraints.maxIterations}${spec.constraints.allowRaymarching ? '\n- Raymarching is allowed for 3D effects' : ''}
- No texture/sampler2D support (math-based patterns only)${spec.modification?.requestedChange ? `\n\nMODIFICATION REQUEST:\n- Change requested: "${spec.modification.requestedChange}"${spec.modification.preserve?.length ? `\n- Preserve these elements: ${spec.modification.preserve.join(', ')}` : ''}${spec.modification.currentProblem ? `\n- Current problem: "${spec.modification.currentProblem}"` : ''}` : ''}

The spec above takes priority when there is any conflict with the user's vague wording.${plan ? `\n\nTECHNIQUE PLAN (implementation strategy — follow this):
${JSON.stringify(plan, null, 2)}

PLAN RULES:
- Follow the TechniquePlan as the implementation strategy. Do not ignore it.
- The plan is more important than vague artistic wording.
- Use the specified base technique, coordinate system, noise method, and motion.
- Apply the listed effects and color method.
- Stay within the max loop budget (${plan.maxLoopBudget} iterations max).
- Avoid these features: ${plan.avoid.join(', ')}${plan.promptHints.length > 0 ? `\n- Additional hints:\n${plan.promptHints.map(h => `  * ${h}`).join('\n')}` : ''}` : ''}${goldenExamples && goldenExamples.length > 0 ? `\n\nGOLDEN REFERENCE EXAMPLES (use as quality/style references, do not copy verbatim):
${goldenExamples.map((ex, i) => `\n--- Example ${i + 1}: ${ex.title} (${ex.id}) ---
Notes: ${ex.notes}
\`\`\`glsl
${ex.code}
\`\`\``).join('\n')}

GOLDEN EXAMPLE RULES:
- Use these as quality and style references, not code to copy blindly.
- Follow ShaderSpec and TechniquePlan first — the examples show HOW to write good GLSL, not WHAT to create.
- Do not copy example code verbatim if the user asks for a different scene.
- Adapt the patterns and techniques to match the requested spec.` : ''}${modifyIntent ? `\n\nMODIFY INTENT (parsed from user request):
${JSON.stringify(modifyIntent, null, 2)}

MODIFY INTENT RULES:
- Language: ${modifyIntent.language}
- Confidence: ${modifyIntent.confidence}/1.0
- Preserve current structure: ${modifyIntent.preserveCurrentStructure}
- Requires full rewrite: ${modifyIntent.requiresFullRewrite}
- Summary: ${modifyIntent.summary}
- Preserve: ${modifyIntent.preserve.join(', ')}
- Avoid: ${modifyIntent.avoid.join(', ')}
- Operations: ${modifyIntent.operations.map(op => `${op.target} ${op.action} (strength: ${op.strength})`).join('; ')}` : ''}${modifyStrategy ? `\n\nMODIFY STRATEGY (follow this approach):
${JSON.stringify(modifyStrategy, null, 2)}

MODIFY RULES:
- Strategy: ${modifyStrategy.strategy}
- Risk level: ${modifyStrategy.riskLevel}
- ${modifyStrategy.strategy === 'full_rewrite' ? 'You may rewrite the shader significantly.' : 'Preserve the existing shader structure. Make targeted changes only.'}
- Preserve: ${modifyStrategy.preserve.join(', ')}
- Change hints: ${modifyStrategy.changeHints.join(', ')}
- Do NOT rewrite the entire shader unless strategy is full_rewrite.
- Keep existing helper functions, structs, and overall flow intact.` : ''}`;

  return `${base}\n${specInstructions}`;
}
