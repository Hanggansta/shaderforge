import { create } from 'zustand';

interface PreviewState {
  isPlaying: boolean;
  resolution: { width: number; height: number };
  fps: number;
  compileResult: 'none' | 'success' | 'error';

  // Actions
  setPlaying: (playing: boolean) => void;
  setResolution: (width: number, height: number) => void;
  setFps: (fps: number) => void;
  setCompileResult: (result: 'none' | 'success' | 'error') => void;
  reset: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  isPlaying: true,
  resolution: { width: 0, height: 0 },
  fps: 0,
  compileResult: 'none',

  setPlaying: (isPlaying) => set({ isPlaying }),
  setResolution: (width, height) => set({ resolution: { width, height } }),
  setFps: (fps) => set({ fps }),
  setCompileResult: (compileResult) => set({ compileResult }),
  reset: () => set({
    isPlaying: true,
    resolution: { width: 0, height: 0 },
    fps: 0,
    compileResult: 'none',
  }),
}));
