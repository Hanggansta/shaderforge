/**
 * Shader Compiler (Tool 2)
 *
 * V1 implementation wraps `compileShaderCandidate` from
 * `src/services/shader/shader-compiler.ts`. The compile is real (WebGL2),
 * and the error log is structured into the CompileReport schema.
 */

import { compileShaderCandidate } from '../../services/shader/shader-compiler';
import type { ShaderCompileResult } from '../../services/shader/types';
import type { CompileReport, CompileError } from '../schemas/compile-report';
import { analyzeShaderErrors } from './error-analyzer';
import { cleanShaderCode } from './clean-code';

export interface CompileOptions {
  skipClean?: boolean;
}

export async function compileShader(
  code: string,
  options: CompileOptions = {}
): Promise<CompileReport> {
  const start = performance.now();
  const cleanup = cleanShaderCode(code);
  const cleaned = options.skipClean ? code : cleanup.code;
  const result: ShaderCompileResult = compileShaderCandidate(cleaned);
  const durationMs = performance.now() - start;

  if (result.success) {
    return { ok: true, errors: [], rawLog: '', durationMs };
  }

  const raw = result.errorLog ?? '';
  const analyzed = analyzeShaderErrors(raw);

  const errors: CompileError[] = analyzed.errors.map((e) => ({
    line: e.line ?? 0,
    column: e.column,
    message: e.rawMessage,
    category: mapErrorCategory(e.errorType),
  }));

  return { ok: false, errors, rawLog: raw, durationMs };
}

function mapErrorCategory(errorType: string): CompileError['category'] {
  if (errorType === 'undeclared_identifier') return 'undeclared';
  if (errorType === 'type_conversion' || errorType === 'dimension_mismatch') return 'type';
  if (errorType === 'redefinition') return 'redefinition';
  if (errorType === 'no_matching_function') return 'no_matching_function';
  if (errorType === 'syntax_error') return 'syntax';
  return 'other';
}
