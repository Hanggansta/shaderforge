/**
 * Compile-Fix Loop — shared loop that compiles a shader, hands failures to
 * the Code/Patch Agent, and retries up to N times.
 *
 * Used by both `generate-shader.ts` and `patch-shader.ts`. Keeps the
 * retry / fallback semantics in one place.
 */

import type { LLMClient } from '../llm-client';
import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import type { ReferenceCard } from '../schemas/reference-card';
import type { CompileReport } from '../schemas/compile-report';
import { compileShader } from '../tools/shader-compiler';
import { runCodePatchAgent, type CodePatchInput, type CodePatchOutput } from '../agents/code-patch-agent';

export interface CompileFixLoopInput {
  llm: LLMClient | null;
  visualCard: VisualCard;
  shaderPlan: ShaderPlan;
  references: ReferenceCard[];
  userPrompt: string;
  /** The first code to compile (from first-pass generation). */
  initialCode: string;
  initialRawResponse: string;
  maxAttempts: number;
}

export interface CompileFixLoopOutput {
  finalCode: string;
  finalReport: CompileReport;
  attempts: number;
  /** All compile reports, in order. */
  reports: CompileReport[];
  /** The raw LLM response from each attempt. */
  rawResponses: string[];
}

export async function runCompileFixLoop(
  input: CompileFixLoopInput
): Promise<CompileFixLoopOutput> {
  const reports: CompileReport[] = [];
  const rawResponses: string[] = [input.initialRawResponse];
  let current = input.initialCode;

  for (let attempt = 1; attempt <= input.maxAttempts; attempt++) {
    const report = await compileShader(current);
    reports.push(report);
    if (report.ok) {
      return {
        finalCode: current,
        finalReport: report,
        attempts: attempt,
        reports,
        rawResponses,
      };
    }
    if (attempt === input.maxAttempts) break;
    // Hand the failure to the Code/Patch agent.
    const fixInput: CodePatchInput = {
      mode: 'fix_compile_error',
      visualCard: input.visualCard,
      shaderPlan: input.shaderPlan,
      references: input.references,
      previousCode: current,
      compileReport: report,
      userPrompt: input.userPrompt,
    };
    const fixOutput: CodePatchOutput = await runCodePatchAgent(fixInput, input.llm);
    current = fixOutput.code;
    rawResponses.push(fixOutput.rawResponse);
  }

  // Exhausted retries. Return the last attempt's report.
  const lastReport = reports[reports.length - 1];
  return {
    finalCode: current,
    finalReport: lastReport,
    attempts: input.maxAttempts,
    reports,
    rawResponses,
  };
}
