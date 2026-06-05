export interface ShaderCompileResult {
  success: boolean;
  errorLog?: string;
  errors?: ShaderCompileError[];
}

export interface ShaderCompileError {
  line: number;
  column: number;
  message: string;
}

// Number of header lines added by wrapFragmentShader before user code
// Count: #version, precision, blank, comment, 6 uniforms, blank, comment = 12 lines
export const WRAPPER_HEADER_LINE_COUNT = 12;
