import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { usePreviewStore } from '../../store/previewStore';

// Vertex shader for fullscreen quad
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Clean up common AI-generated issues
function cleanShaderCode(code: string): string {
  let cleaned = code;

  // Remove #version directives (we add our own)
  cleaned = cleaned.replace(/^\s*#version\s+\d+\s+\w+\s*;?\s*$/gm, '');

  // Remove #ifdef GL_ES / #endif blocks
  cleaned = cleaned.replace(/#ifdef\s+GL_ES[\s\S]*?#endif/g, '');

  // Remove redundant precision declarations (we add our own)
  cleaned = cleaned.replace(/^\s*precision\s+\w+\s+\w+\s*;\s*$/gm, '');

  // Remove redundant uniform declarations (we add our own)
  cleaned = cleaned.replace(/^\s*uniform\s+(float|int|vec[234]|mat[234])\s+i\w+\s*;\s*$/gm, '');

  // Clean up multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// Wrapper for Shadertoy-style mainImage
function wrapFragmentShader(userCode: string): string {
  const cleaned = cleanShaderCode(userCode);

  // Check if code already has mainImage
  if (cleaned.includes('mainImage')) {
    return `#version 300 es
precision mediump float;

// Auto-provided uniforms
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform vec4 iDate;

// User code
${cleaned}

// Auto-generated main function
out vec4 fragColor;
void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}`;
  }

  // If code has main(), use it directly
  if (cleaned.includes('void main()')) {
    return `#version 300 es
precision mediump float;

// Auto-provided uniforms
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform vec4 iDate;

// User code
${cleaned}`;
  }

  throw new Error('No mainImage() or main() function found');
}

export function PreviewPanel({ maximized, onToggleMaximize }: {
  maximized?: boolean;
  onToggleMaximize?: () => void;
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const vertShaderRef = useRef<WebGLShader | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, clickX: 0, clickY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const code = useEditorStore((s) => s.code);
  const compileStatus = useEditorStore((s) => s.compileStatus);
  const setCompileStatus = useEditorStore((s) => s.setCompileStatus);
  const setCompileErrors = useEditorStore((s) => s.setCompileErrors);
  const setLastValidCode = useEditorStore((s) => s.setLastValidCode);

  const isPlaying = usePreviewStore((s) => s.isPlaying);
  const fps = usePreviewStore((s) => s.fps);
  const setPlaying = usePreviewStore((s) => s.setPlaying);
  const setResolution = usePreviewStore((s) => s.setResolution);
  const setFps = usePreviewStore((s) => s.setFps);
  const setCompileResult = usePreviewStore((s) => s.setCompileResult);

  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() / 1000 });

  const compileShader = useCallback((gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader) || 'Unknown error';
      gl.deleteShader(shader);
      throw new Error(error);
    }

    return shader;
  }, []);

  const parseShaderError = useCallback((errorLog: string): { line: number; message: string }[] => {
    const errors: { line: number; message: string }[] = [];
    const lines = errorLog.split('\n');

    for (const line of lines) {
      // Match patterns like "ERROR: 0:15: ..." or "0:15(1): ..."
      const match = line.match(/(?:ERROR:\s*)?(\d+):(\d+)(?:\(\d+\))?:\s*(.*)/);
      if (match) {
        const lineNum = parseInt(match[2], 10);
        // Adjust for wrapper offset (11 lines of header before user code)
        const userLine = Math.max(1, lineNum - 11);
        errors.push({ line: userLine, message: match[3].trim() });
      }
    }

    return errors;
  }, []);

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }

    glRef.current = gl;

    // Create fullscreen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Compile vertex shader
    const vertShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    if (!vertShader) return;

    vertShaderRef.current = vertShader;

    startTimeRef.current = performance.now() / 1000;
    lastTimeRef.current = startTimeRef.current;

    // Set initial resolution
    resizeCanvas();
  }, [compileShader]);

  const compileAndLink = useCallback((userCode: string) => {
    const gl = glRef.current;
    if (!gl) return false;

    try {
      setCompileStatus('compiling');

      const fragSource = wrapFragmentShader(userCode);
      const fragShader = compileShader(gl, fragSource, gl.FRAGMENT_SHADER);

      if (!fragShader) {
        setCompileStatus('error');
        return false;
      }

      // Create program
      const program = gl.createProgram();
      if (!program) {
        gl.deleteShader(fragShader);
        setCompileStatus('error');
        return false;
      }

      gl.attachShader(program, vertShaderRef.current!);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program) || 'Unknown link error';
        gl.deleteProgram(program);
        gl.deleteShader(fragShader);

        const errors = parseShaderError(error);
        setCompileErrors(errors.map((e) => ({
          line: e.line,
          column: 0,
          message: e.message,
          source: 'fragment' as const,
        })));
        setCompileStatus('error');
        setCompileResult('error');
        return false;
      }

      // Clean up old program
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
      }

      programRef.current = program;
      gl.deleteShader(fragShader);

      // Use new program
      gl.useProgram(program);

      // Set up attributes
      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      setCompileStatus('success');
      setCompileErrors([]);
      setCompileResult('success');
      setLastValidCode(userCode);

      // Reset FPS counter so first measurement starts fresh
      fpsCounterRef.current = { frames: 0, lastTime: performance.now() / 1000 };

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errors = parseShaderError(message);
      setCompileErrors(errors.map((e) => ({
        line: e.line,
        column: 0,
        message: e.message,
        source: 'fragment' as const,
      })));
      setCompileStatus('error');
      setCompileResult('error');
      return false;
    }
  }, [compileShader, parseShaderError, setCompileStatus, setCompileErrors, setCompileResult, setLastValidCode]);

  const render = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    const now = performance.now() / 1000;
    const time = now - startTimeRef.current;
    const deltaTime = now - lastTimeRef.current;
    lastTimeRef.current = now;
    frameRef.current++;

    // Update FPS counter (sample every 500ms)
    fpsCounterRef.current.frames++;
    if (now - fpsCounterRef.current.lastTime >= 0.5) {
      const fps = Math.round(fpsCounterRef.current.frames / (now - fpsCounterRef.current.lastTime));
      setFps(fps);
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = now;
    }

    // Set uniforms
    gl.useProgram(program);

    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iTimeDeltaLoc = gl.getUniformLocation(program, 'iTimeDelta');
    const iFrameLoc = gl.getUniformLocation(program, 'iFrame');
    const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
    const iMouseLoc = gl.getUniformLocation(program, 'iMouse');
    const iDateLoc = gl.getUniformLocation(program, 'iDate');

    if (iTimeLoc) gl.uniform1f(iTimeLoc, time);
    if (iTimeDeltaLoc) gl.uniform1f(iTimeDeltaLoc, deltaTime);
    if (iFrameLoc) gl.uniform1i(iFrameLoc, frameRef.current);
    if (iResolutionLoc) {
      gl.uniform3f(iResolutionLoc, gl.canvas.width, gl.canvas.height, 1.0);
    }
    if (iMouseLoc) {
      gl.uniform4f(iMouseLoc, mouseRef.current.x, mouseRef.current.y, mouseRef.current.clickX, mouseRef.current.clickY);
    }
    if (iDateLoc) {
      const date = new Date();
      gl.uniform4f(iDateLoc, date.getFullYear(), date.getMonth(), date.getDate(), date.getSeconds() + date.getMilliseconds() / 1000);
    }

    // Draw
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [setFps]);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const startRenderLoop = useCallback(() => {
    const loop = () => {
      if (isPlayingRef.current) {
        render();
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [render]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;

    const container = canvas.parentElement;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    setResolution(canvas.width, canvas.height);
  }, [setResolution]);

  // Initialize WebGL
  useEffect(() => {
    initWebGL();
    startRenderLoop();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [initWebGL, startRenderLoop]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvas]);

  // Compile shader when code changes
  useEffect(() => {
    const timer = setTimeout(() => {
      compileAndLink(code);
    }, 300);

    return () => clearTimeout(timer);
  }, [code, compileAndLink]);

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    mouseRef.current.x = (e.clientX - rect.left) * dpr;
    mouseRef.current.y = (canvas.height - (e.clientY - rect.top) * dpr);
  };

  const handleMouseDown = (_e: React.MouseEvent<HTMLCanvasElement>) => {
    mouseRef.current.clickX = mouseRef.current.x;
    mouseRef.current.clickY = mouseRef.current.y;
  };

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        // Resize canvas after fullscreen
        setTimeout(resizeCanvas, 100);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(resizeCanvas, 100);
      }).catch(console.error);
    }
  }, [resizeCanvas]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(resizeCanvas, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [resizeCanvas]);

  return (
    <div className="preview-panel panel" ref={containerRef} style={{
      position: isFullscreen ? 'fixed' : undefined,
      top: isFullscreen ? 0 : undefined,
      left: isFullscreen ? 0 : undefined,
      right: isFullscreen ? 0 : undefined,
      bottom: isFullscreen ? 0 : undefined,
      width: isFullscreen ? '100vw' : undefined,
      height: isFullscreen ? '100vh' : undefined,
      zIndex: isFullscreen ? 9999 : undefined,
      background: isFullscreen ? '#000' : undefined,
    }}>
      <div className="panel-header">
        <span className="panel-title">Preview</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className={`status-indicator ${compileStatus}`} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {compileStatus === 'compiling' ? 'Compiling...' : compileStatus}
          </span>
          <button
            className="preview-btn"
            onClick={onToggleMaximize}
            title={maximized ? 'Restore' : 'Maximize'}
            style={{ padding: '2px 6px', fontSize: 12 }}
          >
            {maximized ? '❐' : '⬜'}
          </button>
          <button
            className="preview-btn"
            onClick={handleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            style={{ padding: '2px 6px', fontSize: 12 }}
          >
            {isFullscreen ? '⊟' : '⊞'}
          </button>
        </div>
      </div>
      <div className="panel-content">
        <div className="preview-canvas-container">
          <canvas
            ref={canvasRef}
            className="preview-canvas"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
          />
        </div>
        <div className="preview-controls">
          <div className="preview-controls-left">
            <button
              className={`preview-btn ${isPlaying ? 'active' : ''}`}
              onClick={() => setPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              className="preview-btn"
              onClick={() => {
                startTimeRef.current = performance.now() / 1000;
                frameRef.current = 0;
              }}
            >
              ⟲ Reset
            </button>
          </div>
          <div className="preview-controls-right">
            <span>FPS: {fps}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
