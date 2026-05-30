import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { usePreviewStore } from '../../store/previewStore';
import { useAIStore, type TelemetrySummary } from '../../store/aiStore';
import { VERTEX_SHADER, wrapFragmentShader } from '../../services/shader/wrap-fragment-shader';
import { parseShaderError } from '../../services/shader/parse-shader-error';
import { aiService } from '../../ai/service';
import { canApplyAutoRepair } from '../../ai/telemetry/auto-repair-safety';
import { friendlyQualityLabel } from '../../ai/telemetry/quality-labels';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityLabel, setQualityLabel] = useState<string | null>(null);
  const [qualitySeverity, setQualitySeverity] = useState<string>('low');

  const code = useEditorStore((s) => s.code);
  const compileStatus = useEditorStore((s) => s.compileStatus);
  const setCompileStatus = useEditorStore((s) => s.setCompileStatus);
  const setCompileErrors = useEditorStore((s) => s.setCompileErrors);
  const setLastValidCode = useEditorStore((s) => s.setLastValidCode);
  const setCodeFromRepair = useEditorStore((s) => s.setCodeFromRepair);

  const isPlaying = usePreviewStore((s) => s.isPlaying);
  const fps = usePreviewStore((s) => s.fps);
  const setPlaying = usePreviewStore((s) => s.setPlaying);
  const setResolution = usePreviewStore((s) => s.setResolution);
  const setFps = usePreviewStore((s) => s.setFps);
  const setCompileResult = usePreviewStore((s) => s.setCompileResult);

  const fpsCounterRef = useRef({ frames: 0, lastTime: -1 });

  // Telemetry tracking - capture once per AI-generated shader
  const lastRequestId = useEditorStore((s) => s.lastRequestId);
  const clearRequestId = useEditorStore((s) => s.clearRequestId);
  const telemetryCapturedRef = useRef<string | null>(null);
  const telemetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (telemetryTimerRef.current) {
        clearTimeout(telemetryTimerRef.current);
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

  // Telemetry: capture render quality after AI-generated shader compiles
  useEffect(() => {
    // Only run if we have a requestId (AI-generated) and haven't captured yet
    if (!lastRequestId || telemetryCapturedRef.current === lastRequestId) {
      return;
    }

    // Only capture after successful compilation
    if (compileStatus !== 'success') {
      return;
    }

    // Explicitly require codeSource === 'ai_generation'
    // Skip manual edits AND quality_repair (prevent re-triggering)
    const currentCodeSource = useEditorStore.getState().codeSource;
    if (currentCodeSource !== 'ai_generation') {
      if (import.meta.env.DEV) {
        console.debug('[Telemetry] Skipped: codeSource is', currentCodeSource, '(need ai_generation)');
      }
      return;
    }

    // Mark as captured immediately to prevent re-entry
    telemetryCapturedRef.current = lastRequestId;

    // Capture snapshot of editor state at trigger time for stale-check later
    const triggerRequestId = lastRequestId;
    const triggerCode = useEditorStore.getState().code;

    // Wait for shader to render a few frames before capturing
    telemetryTimerRef.current = setTimeout(async () => {
      const gl = glRef.current;
      const canvas = canvasRef.current;

      if (!gl || !canvas || gl.isContextLost()) {
        clearRequestId();
        return;
      }

      try {
        const result = await aiService.captureRenderTelemetry(
          gl,
          canvas.width,
          canvas.height,
          triggerRequestId,
          triggerCode
        );

        if (result?.success && result.diagnosis) {
          const diag = result.diagnosis;
          if (import.meta.env.DEV) {
            console.debug('[Telemetry] Quality diagnosis:', diag.summary);
            if (diag.issues.length > 0) {
              console.debug('[Telemetry] Issues:', diag.issues);
            }
            if (result.repairPlan) {
              console.debug('[Telemetry] Repair plan:', result.repairPlan.summary);
            }
          }

          // Build quality label from signals or diagnosis
          const primaryIssue = diag.issues[0];
          const qualityLabel = diag.shouldRepair
            ? (primaryIssue?.category || 'issues found')
            : 'healthy';
          const qualitySeverity = diag.severity || 'low';

          // Prepare telemetry summary for chat display
          const telemetrySummary: TelemetrySummary = {
            qualityLabel,
            qualitySeverity,
            repairAttempted: !!result.autoRepair?.attempted,
            repairSuccess: result.autoRepair?.success,
            repairSummary: result.autoRepair?.attempted
              ? (result.autoRepair.success ? 'improved' : 'could not improve')
              : undefined,
            metrics: result.metrics ? {
              brightness: result.metrics.brightness,
              contrast: result.metrics.contrast,
              saturation: result.metrics.saturation,
            } : undefined,
          };

          // Update the last assistant message with telemetry data
          useAIStore.getState().updateLastAssistantMessage(telemetrySummary);

          // Update preview header quality indicator
          setQualityLabel(qualityLabel);
          setQualitySeverity(qualitySeverity);

          // Handle auto-repair result — verify editor state before applying
          if (result.autoRepair?.attempted && result.autoRepair.success && result.autoRepair.code) {
            // Re-read editor store to verify nothing changed during repair
            const state = useEditorStore.getState();
            const stateMatches = canApplyAutoRepair(
              { requestId: triggerRequestId, code: triggerCode },
              state
            );

            if (!stateMatches) {
              if (import.meta.env.DEV) {
                console.debug('[AutoRepair] Skipped applying: editor state changed during repair', {
                  codeSource: state.codeSource,
                  requestIdMatch: state.lastRequestId === triggerRequestId,
                  codeMatch: state.code === triggerCode,
                });
              }
            } else {
              if (import.meta.env.DEV) {
                console.debug('[AutoRepair] Applying repaired code');
              }
              setCodeFromRepair(result.autoRepair.code, triggerRequestId);
            }
          } else if (result.autoRepair?.attempted) {
            if (import.meta.env.DEV) {
              console.debug('[AutoRepair] Failed or skipped:', result.autoRepair.error);
            }
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug('[Telemetry] Capture failed:', err);
        }
      } finally {
        clearRequestId();
      }
    }, 1500); // Wait 1.5s for shader to render ~90 frames at 60fps

    return () => {
      if (telemetryTimerRef.current) {
        clearTimeout(telemetryTimerRef.current);
        telemetryTimerRef.current = null;
      }
    };
  }, [compileStatus, lastRequestId, clearRequestId, setCodeFromRepair]);

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
          <div className={`status-indicator ${compileStatus}`} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {compileStatus === 'compiling' ? 'Compiling...' : compileStatus}
          </span>
          {qualityLabel && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 8,
              background: (qualitySeverity === 'high' ? '#f85149' : qualitySeverity === 'medium' ? '#d29922' : '#3fb950') + '20',
              color: qualitySeverity === 'high' ? '#f85149' : qualitySeverity === 'medium' ? '#d29922' : '#3fb950',
            }}>
              {friendlyQualityLabel(qualityLabel)}
            </span>
          )}
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
