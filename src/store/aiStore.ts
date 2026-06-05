import { create } from 'zustand';
import type { AIIntent } from '../shader-agent/integration/types/ai-provider';

const CANDIDATE_COUNT_KEY = 'shaderforge-ai-candidate-count';
const DEFAULT_CANDIDATE_COUNT = 1;
const MIN_CANDIDATE_COUNT = 1;
const MAX_CANDIDATE_COUNT = 3;

function loadCandidateCount(): number {
  try {
    const stored = localStorage.getItem(CANDIDATE_COUNT_KEY);
    if (!stored) return DEFAULT_CANDIDATE_COUNT;
    const parsed = Number.parseInt(stored, 10);
    if (Number.isNaN(parsed)) return DEFAULT_CANDIDATE_COUNT;
    return Math.min(MAX_CANDIDATE_COUNT, Math.max(MIN_CANDIDATE_COUNT, parsed));
  } catch {
    return DEFAULT_CANDIDATE_COUNT;
  }
}

function persistCandidateCount(count: number): void {
  try {
    localStorage.setItem(CANDIDATE_COUNT_KEY, String(count));
  } catch {
    // ignore quota / disabled storage
  }
}

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

export interface GenerationSummary {
  sceneType: string;
  mood: string;
  palette: string;
  baseTechnique: string;
  motionType: string;
  goldenExampleCount: number;
  attempts: number;
  candidateCount?: number;
  /** 0-100 visual quality score for the chosen candidate, when evaluated. */
  visualScore?: number;
  /** Short label of the weakest visual metric (e.g. "brightness too dark"). */
  visualWeakest?: string;
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
  generationSummary?: GenerationSummary;
}

export type AIRequestState = 'idle' | 'loading' | 'error' | 'cancelled';

interface AIState {
  messages: ChatMessage[];
  activeIntent: AIIntent;
  requestState: AIRequestState;
  lastError: string | null;
  providerName: string;
  modelName: string;
  /**
   * Number of shader candidates to generate in parallel and rank by visual
   * quality. 1 = single-shot (cheapest). 2-3 trades API cost for better
   * visual results because the visual scorer can pick the best one.
   */
  candidateCount: number;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (telemetry: TelemetrySummary) => void;
  setActiveIntent: (intent: AIIntent) => void;
  setRequestState: (state: AIRequestState) => void;
  setLastError: (error: string | null) => void;
  setProvider: (name: string, model: string) => void;
  setCandidateCount: (count: number) => void;
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
  candidateCount: loadCandidateCount(),

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

  setCandidateCount: (count) => {
    const clamped = Math.min(3, Math.max(1, Math.floor(count)));
    persistCandidateCount(clamped);
    set({ candidateCount: clamped });
  },

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
