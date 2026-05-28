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

export const useUiStore = create<UiState>((set) => ({
  panels: {
    ai: { collapsed: false, width: 300 },
    editor: { collapsed: false },
    preview: { collapsed: false, width: 400 },
  },
  activeTab: 'code',
  theme: 'dark',

  togglePanel: (panel) => set((state) => ({
    panels: {
      ...state.panels,
      [panel]: { ...state.panels[panel], collapsed: !state.panels[panel].collapsed },
    },
  })),
  setPanelWidth: (panel, width) => set((state) => ({
    panels: {
      ...state.panels,
      [panel]: { ...state.panels[panel], width },
    },
  })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setTheme: (theme) => set({ theme }),
}));
