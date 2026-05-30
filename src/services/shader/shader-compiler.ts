import type { ShaderCompileResult } from './types';
import { VERTEX_SHADER, wrapFragmentShader } from './wrap-fragment-shader';
import { parseShaderError } from './parse-shader-error';

let gl: WebGL2RenderingContext | null = null;
let vertShader: WebGLShader | null = null;

function getContext(): { gl: WebGL2RenderingContext; vertShader: WebGLShader } | null {
  if (gl && vertShader) return { gl, vertShader };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!ctx) return null;

    gl = ctx;

    // Compile vertex shader once
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl = null;
      return null;
    }
    vertShader = vs;
    return { gl, vertShader };
  } catch {
    gl = null;
    vertShader = null;
    return null;
  }
}

export function compileShaderCandidate(userCode: string): ShaderCompileResult {
  const ctx = getContext();
  if (!ctx) {
    return { success: false, errorLog: 'WebGL2 not available' };
  }

  const { gl, vertShader } = ctx;

  let fragSource: string;
  try {
    fragSource = wrapFragmentShader(userCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown wrapper error';
    return { success: false, errorLog: message };
  }

  // Compile fragment shader
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragShader, fragSource);
  gl.compileShader(fragShader);

  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    const errorLog = gl.getShaderInfoLog(fragShader) || 'Unknown compile error';
    gl.deleteShader(fragShader);
    return { success: false, errorLog, errors: parseShaderError(errorLog) };
  }

  // Link program
  const program = gl.createProgram()!;
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const errorLog = gl.getProgramInfoLog(program) || 'Unknown link error';
    gl.deleteShader(fragShader);
    gl.deleteProgram(program);
    return { success: false, errorLog, errors: parseShaderError(errorLog) };
  }

  // Success — clean up
  gl.deleteShader(fragShader);
  gl.deleteProgram(program);
  return { success: true };
}
