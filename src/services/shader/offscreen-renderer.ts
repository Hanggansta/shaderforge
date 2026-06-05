/**
 * Offscreen WebGL Renderer
 * Compiles and renders shaders to an offscreen canvas for pixel capture.
 * Does not touch the live preview canvas.
 * Used for multi-candidate evaluation and visual scoring.
 */

import { VERTEX_SHADER, wrapFragmentShader } from './wrap-fragment-shader';
import type { ShaderCompileResult } from './types';
import { parseShaderError } from './parse-shader-error';

export interface RenderFrame {
  pixels: Uint8Array;
  width: number;
  height: number;
}

export interface OffscreenRendererOptions {
  width?: number;
  height?: number;
}

export interface OffscreenRenderer {
  compile(userCode: string): ShaderCompileResult;
  render(time: number): RenderFrame | null;
  renderSequence(count: number, fps?: number): RenderFrame[];
  dispose(): void;
}

const DEFAULT_WIDTH = 256;
const DEFAULT_HEIGHT = 256;

const QUAD_VERTICES = new Float32Array([
  -1, -1,  1, -1,  -1,  1,
  -1,  1,  1, -1,   1,  1,
]);

export function isOffscreenRendererAvailable(): boolean {
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const test = new OffscreenCanvas(1, 1);
      const gl = test.getContext('webgl2');
      if (gl) return true;
    }
    if (typeof document !== 'undefined') {
      const test = document.createElement('canvas');
      test.width = 1;
      test.height = 1;
      const gl = test.getContext('webgl2');
      if (gl) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function createOffscreenRenderer(options: OffscreenRendererOptions = {}): OffscreenRenderer | null {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else if (typeof document !== 'undefined') {
      const el = document.createElement('canvas');
      el.width = width;
      el.height = height;
      canvas = el;
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const glNullable = canvas.getContext('webgl2', {
    antialias: false,
    preserveDrawingBuffer: true,
  }) as WebGL2RenderingContext | null;
  if (!glNullable) return null;
  const gl = glNullable;

  const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertShader, VERTEX_SHADER);
  gl.compileShader(vertShader);
  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    gl.deleteShader(vertShader);
    return null;
  }

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

  let program: WebGLProgram | null = null;
  let fragShader: WebGLShader | null = null;
  let uniformLocations: Record<string, WebGLUniformLocation | null> = {};
  let frameCount = 0;
  let lastTime = 0;

  function cleanupProgram(): void {
    if (program) { gl.deleteProgram(program); program = null; }
    if (fragShader) { gl.deleteShader(fragShader); fragShader = null; }
    uniformLocations = {};
  }

  function compile(userCode: string): ShaderCompileResult {
    cleanupProgram();
    let fragSource: string;
    try {
      fragSource = wrapFragmentShader(userCode);
    } catch (e) {
      return { success: false, errorLog: e instanceof Error ? e.message : 'Unknown wrapper error' };
    }

    fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, fragSource);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      const errorLog = gl.getShaderInfoLog(fragShader) || 'Unknown compile error';
      gl.deleteShader(fragShader);
      fragShader = null;
      return { success: false, errorLog, errors: parseShaderError(errorLog) };
    }

    program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const errorLog = gl.getProgramInfoLog(program) || 'Unknown link error';
      gl.deleteProgram(program);
      gl.deleteShader(fragShader);
      program = null;
      fragShader = null;
      return { success: false, errorLog, errors: parseShaderError(errorLog) };
    }

    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    for (const name of ['iTime', 'iTimeDelta', 'iFrame', 'iResolution', 'iMouse', 'iDate']) {
      uniformLocations[name] = gl.getUniformLocation(program, name);
    }
    frameCount = 0;
    lastTime = 0;
    return { success: true };
  }

  function render(time: number): RenderFrame | null {
    if (!program) return null;
    const timeDelta = frameCount === 0 ? 0 : time - lastTime;
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    const iTime = uniformLocations.iTime;
    if (iTime !== null) gl.uniform1f(iTime, time);
    const iTimeDelta = uniformLocations.iTimeDelta;
    if (iTimeDelta !== null) gl.uniform1f(iTimeDelta, timeDelta);
    const iFrame = uniformLocations.iFrame;
    if (iFrame !== null) gl.uniform1i(iFrame, frameCount);
    const iResolution = uniformLocations.iResolution;
    if (iResolution !== null) gl.uniform3f(iResolution, width, height, 1);
    const iMouse = uniformLocations.iMouse;
    if (iMouse !== null) gl.uniform4f(iMouse, 0, 0, 0, 0);
    const iDate = uniformLocations.iDate;
    if (iDate !== null) gl.uniform4f(iDate, 0, 0, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    lastTime = time;
    frameCount++;
    return { pixels, width, height };
  }

  function renderSequence(count: number, fps = 30): RenderFrame[] {
    const frames: RenderFrame[] = [];
    const frameInterval = 1 / fps;
    for (let i = 0; i < count; i++) {
      const time = i * frameInterval;
      const frame = render(time);
      if (frame) frames.push(frame);
    }
    return frames;
  }

  function dispose(): void {
    cleanupProgram();
    gl.deleteBuffer(vbo);
    gl.deleteVertexArray(vao);
    gl.deleteShader(vertShader);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  return { compile, render, renderSequence, dispose };
}
