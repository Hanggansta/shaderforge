import { create } from 'zustand';
import type { AIIntent } from '../ai/adapter';

export interface TelemetrySummary {
  qualityLabel: string;       // e.g. "healthy", "too dark", "low contrast"
  qualitySeverity: string;    // "low", "medium", "high"
  repairAttempted: boolean;
  repairSuccess?: boolean;
  repairSummary?: string;
  metrics?: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  code?: string;
  intent?: AIIntent;
  detectedIntent?: AIIntent;  // For auto mode: the resolved intent
  timestamp: number;
  telemetry?: TelemetrySummary;
}

export type AIRequestState = 'idle' | 'loading' | 'error' | 'cancelled';

interface AIState {
  messages: ChatMessage[];
  activeIntent: AIIntent;
  requestState: AIRequestState;
  lastError: string | null;
  providerName: string;
  modelName: string;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (telemetry: TelemetrySummary) => void;
  setActiveIntent: (intent: AIIntent) => void;
  setRequestState: (state: AIRequestState) => void;
  setLastError: (error: string | null) => void;
  setProvider: (name: string, model: string) => void;
  clearMessages: () => void;
  reset: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  messages: [
    {
      id: 'welcome',
      role: 'system',
      content: 'Welcome to ShaderForge AI! Describe a shader you want to create, or select an intent mode to work with your current code.',
      timestamp: Date.now(),
    },
  ],
  activeIntent: 'auto',
  requestState: 'idle',
  lastError: null,
  providerName: 'Mock AI',
  modelName: 'mock-v1',

  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      },
    ],
  })),

  updateLastAssistantMessage: (telemetry) => set((state) => {
    const messages = [...state.messages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        messages[i] = { ...messages[i], telemetry };
        break;
      }
    }
    return { messages };
  }),

  setActiveIntent: (activeIntent) => set({ activeIntent }),

  setRequestState: (requestState) => set({ requestState }),

  setLastError: (lastError) => set({ lastError }),

  setProvider: (providerName, modelName) => set({ providerName, modelName }),

  clearMessages: () => set({
    messages: [
      {
        id: 'welcome',
        role: 'system',
        content: 'Chat cleared. Describe a shader to get started!',
        timestamp: Date.now(),
      },
    ],
  }),

  reset: () => set({
    messages: [
      {
        id: 'welcome',
        role: 'system',
        content: 'Welcome to ShaderForge AI! Describe a shader you want to create, or select an intent mode to work with your current code.',
        timestamp: Date.now(),
      },
    ],
    activeIntent: 'auto',
    requestState: 'idle',
    lastError: null,
  }),
}));
