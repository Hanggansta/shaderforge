import { create } from 'zustand';

export type CompileStatus = 'idle' | 'queued' | 'compiling' | 'success' | 'error';

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

  // Actions
  setCode: (code: string) => void;
  setCompileStatus: (status: CompileStatus) => void;
  setCompileErrors: (errors: ShaderError[]) => void;
  markDirty: (dirty: boolean) => void;
  setLastValidCode: (code: string | null) => void;
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

  setCode: (code) => set({ code, isDirty: true }),
  setCompileStatus: (compileStatus) => set({ compileStatus }),
  setCompileErrors: (compileErrors) => set({ compileErrors }),
  markDirty: (isDirty) => set({ isDirty }),
  setLastValidCode: (lastValidCode) => set({ lastValidCode }),
  reset: () => set({
    code: DEFAULT_CODE,
    compileStatus: 'idle',
    compileErrors: [],
    isDirty: false,
    lastValidCode: null,
  }),
}));
