import { create } from 'zustand';

export type PanelId = 'ai' | 'editor' | 'preview';

interface PanelState {
  collapsed: boolean;
  width?: number;
}

interface UiState {
  panels: Record<PanelId, PanelState>;
  activeTab: string;
  theme: 'dark' | 'light';

  // Actions
  togglePanel: (panel: PanelId) => void;
  setPanelWidth: (panel: PanelId, width: number) => void;
  setActiveTab: (tab: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const STORAGE_KEY = 'shaderforge-panel-widths';

function loadPersistedWidths(): { ai?: number; preview?: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return {};
}

function persistWidths(ai?: number, preview?: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ai, preview }));
  } catch {
    // ignore
  }
}

const persisted = loadPersistedWidths();

export const useUiStore = create<UiState>((set) => ({
  panels: {
    ai: { collapsed: false, width: persisted.ai ?? 300 },
    editor: { collapsed: false },
    preview: { collapsed: false, width: persisted.preview ?? 400 },
  },
  activeTab: 'code',
  theme: 'dark',

  togglePanel: (panel) => set((state) => ({
    panels: {
      ...state.panels,
      [panel]: { ...state.panels[panel], collapsed: !state.panels[panel].collapsed },
    },
  })),
  setPanelWidth: (panel, width) => set((state) => {
    const newPanels = {
      ...state.panels,
      [panel]: { ...state.panels[panel], width },
    };
    persistWidths(newPanels.ai.width, newPanels.preview.width);
    return { panels: newPanels };
  }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setTheme: (theme) => set({ theme }),
}));
