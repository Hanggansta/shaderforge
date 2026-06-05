/**
 * Agent 3 — Code / Patch Agent
 *
 * The LLM call that produces GLSL. Called twice: first-pass generation and
 * compile-error fixes. Patch mode preserves structure and modifies only
 * affected sections.
 *
 * V1 system prompts are constructed by `prompt-builder.ts` from the
 * VisualCard, ShaderPlan, and golden examples. No external knowledge
 * injection.
 */

import type { LLMClient } from '../llm-client';
import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import type { ReferenceCard } from '../schemas/reference-card';
import type { CompileReport } from '../schemas/compile-report';
import { buildWeightedSystemPrompt, buildContextualFixPrompt } from './prompt-builder';
import { cleanShaderCode, extractGLSLFromResponse } from '../tools/clean-code';
import type { AnalyzedError } from '../tools/error-analyzer';
import type { GoldenShaderExample } from '../tools/golden-shader';

export type CodePatchMode = 'generate' | 'fix_compile_error' | 'fix_user_feedback';

export interface CodePatchInput {
  mode: CodePatchMode;
  visualCard: VisualCard;
  shaderPlan: ShaderPlan;
  references: ReferenceCard[];
  previousCode?: string;
  compileReport?: CompileReport;
  userFeedback?: string;
  userPrompt: string;
}

export interface CodePatchOutput {
  code: string;
  rawResponse: string;
}

export async function runCodePatchAgent(
  input: CodePatchInput,
  llm: LLMClient | null
): Promise<CodePatchOutput> {
  const goldenExamples: GoldenShaderExample[] = input.references
    .filter((r) => r.kind === 'golden')
    .map((r) => ({
      id: r.id,
      title: r.title,
      sceneTypes: [],
      baseTechniques: [],
      moods: [],
      palettes: [],
      performance: 'desktop_balanced',
      tags: r.tags,
      notes: r.summary,
      code: r.body,
    }));

  if (!llm) {
    return { code: stubShader(input.visualCard), rawResponse: '' };
  }

  const ctx = {
    spec: input.visualCard,
    plan: input.shaderPlan,
    goldenExamples,
    intent: input.mode === 'generate' ? 'create' as const : 'modify' as const,
  };

  let system: string;
  let user: string;

  if (input.mode === 'generate') {
    system = buildWeightedSystemPrompt(ctx);
    user = `User prompt: ${input.userPrompt}\n\nGenerate the shader code.`;
  } else if (input.mode === 'fix_compile_error' && input.previousCode && input.compileReport) {
    system = buildWeightedSystemPrompt(ctx);
    const analyzed: AnalyzedError[] = input.compileReport.errors.map((e) => ({
      line: e.line,
      column: e.column ?? 0,
      rawMessage: e.message,
      errorType: categoryToErrorType(e.category),
      possibleCause: '',
      fixDirection: '',
    }));
    user = buildContextualFixPrompt(ctx, input.previousCode, analyzed);
  } else {
    system = buildWeightedSystemPrompt(ctx);
    user = `${input.userPrompt}\n\nCurrent code:\n${input.previousCode ?? ''}\n\nUser feedback: ${input.userFeedback ?? ''}\n\nApply the feedback. Preserve the structure; modify only the affected parts.`;
  }

  const raw = await llm.generateText({ system, user });
  const code = extractGLSLFromResponse(raw) ?? raw;
  const cleaned = cleanShaderCode(code);
  return { code: cleaned.code, rawResponse: raw };
}

function categoryToErrorType(c: string): string {
  if (c === 'undeclared') return 'undeclared_identifier';
  if (c === 'syntax') return 'syntax_error';
  if (c === 'type') return 'type_conversion';
  if (c === 'redefinition') return 'redefinition';
  if (c === 'no_matching_function') return 'no_matching_function';
  return 'syntax_error';
}

function stubShader(_spec: VisualCard): string {
  return `precision mediump float;
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = mix(vec3(0.05, 0.05, 0.1), vec3(0.5, 0.2, 0.6), uv.y);
  fragColor = vec4(col, 1.0);
}`;
}
