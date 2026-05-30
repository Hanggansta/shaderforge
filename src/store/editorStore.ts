import { create } from 'zustand';

export type CompileStatus = 'idle' | 'queued' | 'compiling' | 'success' | 'error';

export type CodeSource = 'ai_generation' | 'quality_repair' | 'manual';

export interface ShaderError {
  line: number;
  column: number;
  message: string;
  source: 'vertex' | 'fragment' | 'link';
}

interface EditorState {
  code: string;
  compileStatus: CompileStatus;
  compileErrors: ShaderError[];
  isDirty: boolean;
  lastValidCode: string | null;
  /** Request ID from last AI generation - used to track AI-generated code for telemetry */
  lastRequestId: string | null;
  /** Source of the current code - tracks provenance for auto-repair safety */
  codeSource: CodeSource;

  // Actions
  setCode: (code: string) => void;
  setCodeFromAI: (code: string, requestId: string) => void;
  setCodeFromRepair: (code: string, requestId: string) => void;
  setCompileStatus: (status: CompileStatus) => void;
  setCompileErrors: (errors: ShaderError[]) => void;
  markDirty: (dirty: boolean) => void;
  setLastValidCode: (code: string | null) => void;
  clearRequestId: () => void;
  reset: () => void;
}

const DEFAULT_CODE = `// ShaderForge - Shadertoy-style shader editor
// Use mainImage() function with iTime, iResolution, iMouse uniforms

precision mediump float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalized pixel coordinates (from 0 to 1)
  vec2 uv = fragCoord / iResolution.xy;

  // Time varying pixel color
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));

  // Output to screen
  fragColor = vec4(col, 1.0);
}`;

export const useEditorStore = create<EditorState>((set) => ({
  code: DEFAULT_CODE,
  compileStatus: 'idle',
  compileErrors: [],
  isDirty: false,
  lastValidCode: null,
  lastRequestId: null,
  codeSource: 'manual',

  setCode: (code) => set({ code, isDirty: true, lastRequestId: null, codeSource: 'manual' }),
  setCodeFromAI: (code, requestId) => set({ code, isDirty: true, lastRequestId: requestId, codeSource: 'ai_generation' }),
  setCodeFromRepair: (code, requestId) => set({ code, isDirty: true, lastRequestId: requestId, codeSource: 'quality_repair' }),
  setCompileStatus: (compileStatus) => set({ compileStatus }),
  setCompileErrors: (compileErrors) => set({ compileErrors }),
  markDirty: (isDirty) => set({ isDirty }),
  setLastValidCode: (lastValidCode) => set({ lastValidCode }),
  clearRequestId: () => set({ lastRequestId: null }),
  reset: () => set({
    code: DEFAULT_CODE,
    compileStatus: 'idle',
    compileErrors: [],
    isDirty: false,
    lastValidCode: null,
    lastRequestId: null,
    codeSource: 'manual',
  }),
}));
