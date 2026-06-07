import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { usePreviewStore } from '../../store/previewStore';
import { VERTEX_SHADER, wrapFragmentShader } from '../../services/shader/wrap-fragment-shader';
import { parseShaderError } from '../../services/shader/parse-shader-error';
import { WorkflowInspectorButton } from '../WorkflowInspector/WorkflowInspectorButton';
import { WorkflowInspectorDrawer } from '../WorkflowInspector/WorkflowInspectorDrawer';

export function PreviewPanel({ maximized, onToggleMaximize, style }: {
  maximized?: boolean;
  onToggleMaximize?: () => void;
  style?: React.CSSProperties;
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
  const uniformsRef = useRef<{
    program: WebGLProgram;
    iTime: WebGLUniformLocation | null;
    iTimeDelta: WebGLUniformLocation | null;
    iFrame: WebGLUniformLocation | null;
    iResolution: WebGLUniformLocation | null;
    iMouse: WebGLUniformLocation | null;
    iDate: WebGLUniformLocation | null;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const slowFrameCountRef = useRef(0);

  const code = useEditorStore((s) => s.code);
  const compileStatus = useEditorStore((s) => s.compileStatus);
  const codeSource = useEditorStore((s) => s.codeSource);
  const setCompileStatus = useEditorStore((s) => s.setCompileStatus);
  const setCompileErrors = useEditorStore((s) => s.setCompileErrors);
  const setLastValidCode = useEditorStore((s) => s.setLastValidCode);

  const isPlaying = usePreviewStore((s) => s.isPlaying);
  const fps = usePreviewStore((s) => s.fps);
  const setPlaying = usePreviewStore((s) => s.setPlaying);
  const setResolution = usePreviewStore((s) => s.setResolution);
  const setFps = usePreviewStore((s) => s.setFps);
  const setCompileResult = usePreviewStore((s) => s.setCompileResult);

  const fpsCounterRef = useRef({ frames: 0, lastTime: -1 });

  // Telemetry tracking - removed in V1 simplification

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

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }

    glRef.current = gl;

    // Handle WebGL context loss/restoration
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); // Signal that we want to handle restoration
      setContextLost(true);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    });

    canvas.addEventListener('webglcontextrestored', () => {
      setContextLost(false);
      // Re-initialize WebGL state by reloading the page
      // (recursive initWebGL call causes lint issues)
      window.location.reload();
    });

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
  }, [compileShader, resizeCanvas]);

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
          column: e.column,
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
        column: e.column,
        message: e.message,
        source: 'fragment' as const,
      })));
      setCompileStatus('error');
      setCompileResult('error');
      return false;
    }
  }, [compileShader, setCompileStatus, setCompileErrors, setCompileResult, setLastValidCode]);

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
    if (fpsCounterRef.current.lastTime < 0) {
      // First frame — initialize timestamp
      fpsCounterRef.current.lastTime = now;
    } else if (now - fpsCounterRef.current.lastTime >= 0.5) {
      const fps = Math.round(fpsCounterRef.current.frames / (now - fpsCounterRef.current.lastTime));
      setFps(fps);
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = now;
    }

    // Set uniforms (cache locations to avoid re-querying every frame)
    gl.useProgram(program);

    if (!uniformsRef.current || uniformsRef.current.program !== program) {
      uniformsRef.current = {
        program,
        iTime: gl.getUniformLocation(program, 'iTime'),
        iTimeDelta: gl.getUniformLocation(program, 'iTimeDelta'),
        iFrame: gl.getUniformLocation(program, 'iFrame'),
        iResolution: gl.getUniformLocation(program, 'iResolution'),
        iMouse: gl.getUniformLocation(program, 'iMouse'),
        iDate: gl.getUniformLocation(program, 'iDate'),
      };
    }
    const u = uniformsRef.current;

    if (u.iTime) gl.uniform1f(u.iTime, time);
    if (u.iTimeDelta) gl.uniform1f(u.iTimeDelta, deltaTime);
    if (u.iFrame) gl.uniform1i(u.iFrame, frameRef.current);
    if (u.iResolution) {
      gl.uniform3f(u.iResolution, gl.canvas.width, gl.canvas.height, 1.0);
    }
    if (u.iMouse) {
      gl.uniform4f(u.iMouse, mouseRef.current.x, mouseRef.current.y, mouseRef.current.clickX, mouseRef.current.clickY);
    }
    if (u.iDate) {
      const date = new Date();
      gl.uniform4f(u.iDate, date.getFullYear(), date.getMonth(), date.getDate(), date.getSeconds() + date.getMilliseconds() / 1000);
    }

    // Draw
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const drawStart = performance.now();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const drawTime = performance.now() - drawStart;

    // Frame time watchdog: auto-pause if shader is too heavy
    if (drawTime > 100) { // > 100ms per frame = < 10 FPS
      slowFrameCountRef.current++;
      if (slowFrameCountRef.current >= 3) {
        // Shader has been running slowly for 3+ consecutive frames (~300ms total)
        setAutoPaused(true);
        setPlaying(false);
        slowFrameCountRef.current = 0;
      }
    } else {
      slowFrameCountRef.current = 0;
    }
  }, [setFps, setPlaying]);

  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const startRenderLoop = useCallback(() => {
    const loop = () => {
      if (isPlayingRef.current) {
        render();
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [render]);

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

  // Handle resize — window and container
  useEffect(() => {
    const handleResize = () => resizeCanvas();

    window.addEventListener('resize', handleResize);

    // ResizeObserver on canvas container for panel resize
    const container = canvasRef.current?.parentElement;
    let observer: ResizeObserver | undefined;
    if (container) {
      observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [resizeCanvas]);

  // Compile shader when code changes
  useEffect(() => {
    const timer = setTimeout(() => {
      compileAndLink(code);
    }, 300);

    return () => clearTimeout(timer);
  }, [code, compileAndLink]);

  // Telemetry/auto-repair removed in V1 simplification. Quality signal
  // (brightness/contrast/saturation) is captured in-process by the
  // candidate-eval path inside the agent loop. The preview panel only
  // needs to render.

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

  const handleSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || compileStatus !== 'success') return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `shader-${Date.now()}.png`;
    a.click();
  }, [compileStatus]);

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
      ...style,
      ...(isFullscreen ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#000',
      } : undefined),
    }}>
      <div className="panel-header">
        <span className="panel-title">Preview</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {contextLost && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 8,
              background: '#f8514920',
              color: '#f85149',
            }}>
              Context Lost — refresh page
            </span>
          )}
          {autoPaused && !contextLost && (
            <button
              onClick={() => { setAutoPaused(false); setPlaying(true); }}
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 8,
                background: '#d2992220',
                color: '#d29922',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Click to resume (shader was auto-paused due to low FPS)"
            >
              ⚠ Auto-paused (slow) — click to resume
            </button>
          )}
          {/* Provenance badge */}
          {compileStatus === 'success' && codeSource !== 'manual' && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 8,
              background: codeSource === 'ai_generation' ? '#3fb95020' : '#d2992220',
              color: codeSource === 'ai_generation' ? '#3fb950' : '#d29922',
            }}>
              {codeSource === 'ai_generation' ? '✨ AI Generated' : '🔧 Auto-Repaired'}
            </span>
          )}
          <div className={`status-indicator ${compileStatus}`} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {compileStatus === 'compiling' ? 'Compiling...' : compileStatus}
          </span>
          <button
            className="preview-btn"
            onClick={handleSnapshot}
            title="Download snapshot"
            style={{ padding: '2px 6px', fontSize: 12 }}
          >
            📸
          </button>
          <button
            className="preview-btn"
            onClick={onToggleMaximize}
            title={maximized ? 'Restore' : 'Maximize'}
            style={{ padding: '2px 6px', fontSize: 12 }}
          >
            {maximized ? '❐' : '⬜'}
          </button>
          <WorkflowInspectorButton
            open={inspectorOpen}
            onClick={() => setInspectorOpen(!inspectorOpen)}
          />
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
      <div className="panel-content" style={{ position: 'relative' }}>
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
        <WorkflowInspectorDrawer
          open={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
        />
      </div>
    </div>
  );
}
