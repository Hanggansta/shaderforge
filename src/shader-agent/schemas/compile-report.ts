/**
 * Compile Report — the result of running a shader through the Shader Compiler tool.
 *
 * `ok` is the only field callers should care about for control flow.
 * `errors` is the structured list of compile errors with line numbers.
 * `rawLog` is the raw WebGL info log (for diagnostics / display).
 */

export interface CompileError {
  line: number;
  column?: number;
  message: string;
  /** Error category. Used by the Patch agent to pick fix strategy. */
  category:
    | 'syntax'
    | 'undeclared'
    | 'type'
    | 'redefinition'
    | 'no_matching_function'
    | 'other';
}

export interface CompileReport {
  ok: boolean;
  errors: CompileError[];
  rawLog: string;
  /** Time taken to compile, in ms. */
  durationMs: number;
}
