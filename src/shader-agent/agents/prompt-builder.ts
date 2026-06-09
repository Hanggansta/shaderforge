/**
 * Prompt Builder
 * Constructs weighted, sectioned prompts for LLM calls.
 *
 * V1 — no knowledge-table injection. The system prompt combines:
 *   1. Hard constraints (renderer capabilities + code structure)
 *   2. ShaderSpec visual intent
 *   3. TechniquePlan implementation strategy
 *   4. (Optional) Golden reference examples
 *   5. Output format
 *
 * For fix mode, section 5 becomes a targeted fix instructions block.
 */

import { getCapabilitiesSummary } from '../tools/renderer-capabilities';
import type { ShaderSpec } from '../schemas/shader-spec';
import type { TechniquePlan } from './technique-plan';
import type { AnalyzedError } from '../tools/error-analyzer';
import { formatErrorsForAI } from '../tools/error-analyzer';
import type { GoldenShaderExample } from '../tools/golden-shader';

export interface PromptContext {
  spec: ShaderSpec;
  plan: TechniquePlan;
  goldenExamples?: GoldenShaderExample[];
  /** Optional intent hint for modification/fix flows. */
  intent?: 'create' | 'modify' | 'fix' | 'explain' | 'optimize';
}

export function buildWeightedSystemPrompt(ctx: PromptContext): string {
  const sections: string[] = [];

  sections.push(`=== HARD CONSTRAINTS (MUST follow — non-negotiable) ===

${getCapabilitiesSummary()}

CODE STRUCTURE RULES:
1. Start with: precision mediump float;
2. Define structs BEFORE using them
3. Define helper functions BEFORE calling them
4. Declare variables BEFORE using them
5. mainImage is the entry point — it MUST exist

PREPROCESSOR RULES:
- #define is ALLOWED for simple constants: #define PI 3.14159, #define MAX_STEPS 100
- #define must be placed BEFORE any code that uses it (at the top of the file)
- Do NOT use #version directive (added automatically)
- Do NOT use #ifdef GL_ES (not needed)

AVOID:
- Do NOT declare uniforms that are auto-provided (iTime, iResolution, etc.)
- Do NOT redefine built-in functions (reflect, normalize, length, etc.)
- Do NOT use iChannel or sampler2D (no texture support)
- Maximum loop iterations: ${ctx.spec.constraints.maxIterations}
${ctx.spec.constraints.allowRaymarching ? '- Raymarching is allowed for 3D effects' : '- No raymarching'}
${ctx.spec.constraints.allowTextures ? '' : '- No texture/sampler2D support (math-based patterns only)'}`);

  const spec = ctx.spec;
  const specLines = [
    `Scene: "${spec.scene.type}"${spec.scene.subject ? ` — ${spec.scene.subject}` : ''}`,
    `Composition: ${spec.scene.composition}`,
    `Material: ${spec.material.type}${spec.material.secondary ? ` + ${spec.material.secondary}` : ''}`,
    `Mood: ${spec.style.mood}${spec.style.visualStyle ? ` (${spec.style.visualStyle})` : ''}`,
    `Motion: ${spec.motion.type}${spec.motion.camera ? `, camera: ${spec.motion.camera}` : ''}`,
    `Depth: ${spec.depth.approach}`,
    `Lighting: ${spec.lighting.model}${spec.lighting.description ? ` — ${spec.lighting.description}` : ''}`,
    `Color: ${spec.color.palette}${spec.color.colors ? ` (${spec.color.colors.join(', ')})` : ''}${spec.color.description ? ` — ${spec.color.description}` : ''}`,
    `Interaction: ${spec.interaction.type}`,
    `Performance: ${spec.constraints.performance}`,
  ];

  sections.push(`=== SHADER SPECIFICATION (visual intent — obey this over vague wording) ===

${specLines.join('\n')}

VISUAL QUALITY RULES (PERFECTION RUBRIC — from DESIGN.md):
- A shader must have strong visual intention. "It compiles and is not black" is NOT acceptable.
- PERFECTION TARGETS (the LLM must internally maximize these before final output):
  * High visual impact: strong contrast, rich/saturated colors, clear focal point, layered depth/detail.
  * Never dull, washed-out, flat, or low-contrast unless the spec explicitly demands minimalism.
  * Material must be recognizable and beautiful (looks like real plasma/liquid/metal/crystal/nebula/fire/etc.).
  * Depth/spatial feeling: use lighting, fog, parallax, volume, or raymarching where appropriate.
  * Motion alive and physical: rhythm, easing, flow, organic behavior — not jitter or static when animation requested.
  * Exact palette fidelity + good brightness/contrast balance matching the requested mood.
- SELF-VERIFICATION STEP (do this mentally before emitting code):
  1. Does the code satisfy every field in the SHADER SPECIFICATION above?
  2. Will the rendered result score high on brightness, contrast, color alignment, and motion (per visual scorer)?
  3. If any target is weak, adjust noise, loops, palettes, or structure to fix it NOW.`);

  sections.push(`=== TECHNIQUE PLAN (implementation strategy — follow this) ===

Base technique: ${ctx.plan.baseTechnique}
Coordinate system: ${ctx.plan.coordinateSystem}
Noise method: ${ctx.plan.noise}
Motion: ${ctx.plan.motion}
Color method: ${ctx.plan.colorMethod}
Effects: ${ctx.plan.effects.length > 0 ? ctx.plan.effects.join(', ') : 'none'}
Max loop budget: ${ctx.plan.maxLoopBudget} iterations
Avoid: ${ctx.plan.avoid.length > 0 ? ctx.plan.avoid.join(', ') : 'none'}${ctx.plan.promptHints.length > 0 ? '\nHints:\n' + ctx.plan.promptHints.map((h) => `  - ${h}`).join('\n') : ''}`);

  if (ctx.goldenExamples && ctx.goldenExamples.length > 0) {
    const exampleSummary = ctx.goldenExamples.map((ex, i) =>
      `Example ${i + 1}: "${ex.title}" — ${ex.notes}\n  Technique: ${ex.baseTechniques.join(', ')} | Tags: ${ex.tags.join(', ')}`
    ).join('\n');
    sections.push(`=== REFERENCE EXAMPLES (quality/style references, do not copy verbatim) ===

${exampleSummary}

RULES:
- Use these as quality and style references, not code to copy blindly.
- Follow the Technique Plan first — examples show HOW to write good GLSL, not WHAT to create.
- Adapt patterns and techniques to match the requested spec.`);
  }

  sections.push(`=== OUTPUT FORMAT ===

- Output ONLY raw GLSL code
- NO markdown fences (no \`\`\`glsl)
- NO explanations before/after the code
- Start directly with: precision mediump float;`);

  return sections.join('\n\n');
}

export function buildContextualFixPrompt(
  ctx: PromptContext,
  code: string,
  errors: AnalyzedError[],
): string {
  const systemPrompt = buildWeightedSystemPrompt(ctx);
  const targetedInstructions = buildTargetedFixInstructions(errors);

  const errorList = formatErrorsForAI ? formatErrorsForAI(errors as any) : errors // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((e) => `Line ${e.line}: [${e.errorType}] ${e.rawMessage}\n  Fix: ${e.fixDirection}`)
    .join('\n');

  const fixPrompt = `The shader code has compilation errors. Fix ONLY these specific errors — do not rewrite unrelated parts.

DETAILED ERRORS + ANALYSIS:
${errorList}

${targetedInstructions}

CURRENT CODE:
${code}

CRITICAL:
- Preserve the visual intent from the Shader Specification 100% (scene, mood, palette, motion, material).
- After fixing the errors, mentally re-check against the PERFECTION RUBRIC above.
- Output the COMPLETE fixed shader code. Do not skip sections.`;

  return `${systemPrompt}\n\n${fixPrompt}`;
}

function buildTargetedFixInstructions(errors: AnalyzedError[]): string {
  const errorTypes = new Set(errors.map((e) => e.errorType));
  const instructions: string[] = [];

  if (errorTypes.has('undeclared_identifier')) {
    const ids = errors
      .filter((e) => e.errorType === 'undeclared_identifier')
      .map((e) => {
        const match = e.rawMessage.match(/'(\w+)'/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    const knownConstants: Record<string, string> = {
      'PI': '#define PI 3.14159265359',
      'TWO_PI': '#define TWO_PI 6.28318530718',
      'HALF_PI': '#define HALF_PI 1.57079632679',
      'EPSILON': '#define EPSILON 0.0001',
    };

    const definesNeeded = ids.filter((id) => id && knownConstants[id]);
    const othersNeeded = ids.filter((id) => id && !knownConstants[id]);

    const parts: string[] = [];
    if (definesNeeded.length > 0) {
      parts.push(`Add these #define constants at the TOP of the file (before any usage):\n${definesNeeded.map((id) => `  ${knownConstants[id!]}`).join('\n')}`);
    }
    if (othersNeeded.length > 0) {
      parts.push(`Define these identifiers before use: ${othersNeeded.join(', ')}. Use struct/variable/function definitions as appropriate.`);
    }
    if (parts.length > 0) {
      instructions.push(`UNDECLARED IDENTIFIERS:\n${parts.join('\n')}`);
    }
  }

  if (errorTypes.has('syntax_error')) {
    instructions.push('SYNTAX ERRORS: Check for missing semicolons, unclosed braces, incorrect operator usage.');
  }
  if (errorTypes.has('type_conversion')) {
    instructions.push('TYPE ERRORS: Add explicit type conversions. Use vec3(x,y,z), float(x), etc.');
  }
  if (errorTypes.has('dimension_mismatch')) {
    instructions.push('DIMENSION ERRORS: Ensure vector dimensions match. Use .xy, .xyz, .rgb swizzling to convert.');
  }
  if (errorTypes.has('redefinition')) {
    instructions.push('REDEFINITION ERRORS: Remove duplicate function/variable definitions. If redefining a built-in (reflect, normalize, etc.), delete your custom version.');
  }
  if (errorTypes.has('no_matching_function')) {
    instructions.push('FUNCTION ERRORS: Check function signature — argument types and count must match the declaration.');
  }
  if (instructions.length === 0) {
    instructions.push('Review the code around the error lines for syntax or type issues.');
  }

  return instructions.join('\n\n');
}
