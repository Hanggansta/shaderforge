/**
 * Adapter: ShaderAgentResult -> AgentResult
 *
 * Bridges the new ShaderResult (returned by workflows) to the legacy
 * AgentResult shape (consumed by AIChatPanel). Only the create / patch
 * / fix flows are covered; legacy-only fields (explanation, candidates,
 * autoRepair, telemetry) are not produced by the new harness.
 */

import type { AgentResult, AgentProgress } from './agent-result-types';
import type { GenerateResult } from '../workflows/generate-shader';
import type { PatchResult } from '../workflows/patch-shader';
import type { AIIntent } from './types/ai-provider';
import type { CompileError } from '../schemas/compile-report';

interface AdaptOptions {
  detectedIntent?: AIIntent;
  intent?: AIIntent;
}

function progressFromCompileAttempts(
  attempts: { ok: boolean }[]
): AgentProgress[] {
  return attempts.map((a, i) => ({
    status: a.ok ? 'success' : 'failed',
    attempt: i + 1,
    maxAttempts: attempts.length,
    message: a.ok ? 'Shader compiled' : 'Compile failed',
  }));
}

function errorsFromCompile(compiled: { errors?: CompileError[] }) {
  return (compiled.errors ?? []).map((e) => ({
    line: e.line,
    column: e.column ?? 0,
    rawMessage: e.message,
    errorType: mapErrorTypeToLegacy(e.category),
    possibleCause: '',
    fixDirection: '',
  }));
}

function mapErrorTypeToLegacy(
  category: CompileError['category']
): 'syntax_error' | 'undeclared_identifier' | 'type_conversion' | 'redefinition' | 'no_matching_function' | 'other' {
  switch (category) {
    case 'syntax': return 'syntax_error';
    case 'undeclared': return 'undeclared_identifier';
    case 'type': return 'type_conversion';
    case 'redefinition': return 'redefinition';
    case 'no_matching_function': return 'no_matching_function';
    default: return 'other';
  }
}

export function adaptGenerateResult(
  result: GenerateResult,
  options: AdaptOptions = {}
): AgentResult {
  const ok = result.compileReport.ok;
  const progress = progressFromCompileAttempts(
    result.compileAttempts.length > 0
      ? result.compileAttempts
      : [result.compileReport]
  );

  return {
    code: result.code,
    success: ok,
    attempts: result.attempts,
    errors: ok ? undefined : errorsFromCompile(result.compileReport),
    progress,
    detectedIntent: options.detectedIntent ?? options.intent,
  };
}

export function adaptPatchResult(
  result: PatchResult,
  options: AdaptOptions = {}
): AgentResult {
  const ok = result.compileReport.ok;
  const progress = progressFromCompileAttempts(
    result.compileAttempts.length > 0
      ? result.compileAttempts
      : [result.compileReport]
  );

  return {
    code: result.code,
    success: ok,
    attempts: result.attempts,
    errors: ok ? undefined : errorsFromCompile(result.compileReport),
    progress,
    detectedIntent: options.detectedIntent ?? options.intent,
  };
}
