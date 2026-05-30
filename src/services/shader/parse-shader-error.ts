import type { ShaderCompileError } from './types';
import { WRAPPER_HEADER_LINE_COUNT } from './types';

export function parseShaderError(errorLog: string): ShaderCompileError[] {
  const errors: ShaderCompileError[] = [];
  const lines = errorLog.split('\n');

  for (const line of lines) {
    // Match patterns like "ERROR: 0:15: ..." or "0:15(1): ..."
    const match = line.match(/(?:ERROR:\s*)?(\d+):(\d+)(?:\(\d+\))?:\s*(.*)/);
    if (match) {
      const lineNum = parseInt(match[2], 10);
      const userLine = Math.max(1, lineNum - WRAPPER_HEADER_LINE_COUNT);
      errors.push({ line: userLine, column: 0, message: match[3].trim() });
    }
  }

  return errors;
}
