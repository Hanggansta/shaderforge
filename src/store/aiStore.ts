import { create } from 'zustand';
import type { AIIntent } from '../shader-agent/integration/types/ai-provider';
import type { VisualCard } from '../shader-agent/schemas/visual-card';

const CANDIDATE_COUNT_KEY = 'shaderforge-ai-candidate-count';
export const DEFAULT_CANDIDATE_COUNT = 1;
const MIN_CANDIDATE_COUNT = 1;
const MAX_CANDIDATE_COUNT = 3;

const MAX_ATTEMPTS_KEY = 'shaderforge-ai-max-attempts';
const DEFAULT_MAX_ATTEMPTS = 3;
const MIN_MAX_ATTEMPTS = 1;
const MAX_MAX_ATTEMPTS = 5;

const STATS_KEY = 'shaderforge-ai-telemetry-stats';
const VISUAL_POLISH_KEY = 'shaderforge-visual-polish';
const RUN_CONTEXT_KEY = 'shaderforge-run-context';

function loadVisualPolish(): boolean {
  try {
    return localStorage.getItem(VISUAL_POLISH_KEY) === '1';
  } catch {
    return false;
  }
}

function persistVisualPolish(enabled: boolean): void {
  try {
    localStorage.setItem(VISUAL_POLISH_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

interface PersistedRunContext {
  visualCard: VisualCard;
  runId: string;
}

function loadRunContext(): PersistedRunContext | null {
  try {
    const raw = sessionStorage.getItem(RUN_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedRunContext;
  } catch {
    return null;
  }
}

function persistRunContext(ctx: PersistedRunContext | null): void {
  try {
    if (!ctx) {
      sessionStorage.removeItem(RUN_CONTEXT_KEY);
      return;
    }
    sessionStorage.setItem(RUN_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}
const EMPTY_STATS: TelemetryStats = {
  totalRuns: 0,
  firstAttemptSuccess: 0,
  retrySuccess: 0,
  totalFailures: 0,
};

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

export function clampMaxAttempts(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_MAX_ATTEMPTS;
  return Math.min(MAX_MAX_ATTEMPTS, Math.max(MIN_MAX_ATTEMPTS, Math.floor(value)));
}

function loadMaxAttempts(): number {
  try {
    const stored = localStorage.getItem(MAX_ATTEMPTS_KEY);
    if (!stored) return DEFAULT_MAX_ATTEMPTS;
    return clampMaxAttempts(Number.parseInt(stored, 10));
  } catch {
    return DEFAULT_MAX_ATTEMPTS;
  }
}

function persistMaxAttempts(value: number): void {
  try {
    localStorage.setItem(MAX_ATTEMPTS_KEY, String(clampMaxAttempts(value)));
  } catch {
    // ignore quota / disabled storage
  }
}

export { MAX_MAX_ATTEMPTS, MIN_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS };

export interface TelemetryStats {
  totalRuns: number;
  /** Compile pass on the first attempt (no retries needed). */
  firstAttemptSuccess: number;
  /** Compile pass only after at least one retry succeeded. */
  retrySuccess: number;
  /** All attempts failed. */
  totalFailures: number;
}

export function applyRunResult(
  stats: TelemetryStats,
  success: boolean,
  attempts: number
): TelemetryStats {
  const safeAttempts = Math.max(1, Math.floor(attempts));
  const totalRuns = stats.totalRuns + 1;
  const firstAttemptSuccess =
    stats.firstAttemptSuccess + (success && safeAttempts === 1 ? 1 : 0);
  const retrySuccess =
    stats.retrySuccess + (success && safeAttempts > 1 ? 1 : 0);
  const totalFailures = stats.totalFailures + (success ? 0 : 1);
  return { totalRuns, firstAttemptSuccess, retrySuccess, totalFailures };
}

function loadStats(): TelemetryStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS };
    const parsed = JSON.parse(raw) as Partial<TelemetryStats> | null;
    if (!parsed) return { ...EMPTY_STATS };
    return {
      totalRuns: Number.isFinite(parsed.totalRuns) ? Number(parsed.totalRuns) : 0,
      firstAttemptSuccess: Number.isFinite(parsed.firstAttemptSuccess) ? Number(parsed.firstAttemptSuccess) : 0,
      retrySuccess: Number.isFinite(parsed.retrySuccess) ? Number(parsed.retrySuccess) : 0,
      totalFailures: Number.isFinite(parsed.totalFailures) ? Number(parsed.totalFailures) : 0,
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

function persistStats(stats: TelemetryStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
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
  /**
   * Maximum compile attempts the V2 retry loop will run per generation.
   * 1 = no retries. Range 1-5. Default 3.
   */
  maxAttempts: number;
  /**
   * Telemetry stats for compile-retry outcomes, persisted across sessions.
   * Updated by AIChatPanel after each generation completes.
   */
  telemetryStats: TelemetryStats;
  /** Last successful run context — used for modify/fix intents. */
  lastVisualCard: VisualCard | null;
  lastRunId: string | null;
  /** Post-success visual polish pass (Pro recommended). Off by default on free tier. */
  visualPolishEnabled: boolean;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (telemetry: TelemetrySummary) => void;
  setActiveIntent: (intent: AIIntent) => void;
  setRequestState: (state: AIRequestState) => void;
  setLastError: (error: string | null) => void;
  setProvider: (name: string, model: string) => void;
  setCandidateCount: (count: number) => void;
  setMaxAttempts: (value: number) => void;
  recordRunResult: (success: boolean, attempts: number) => void;
  setLastRunContext: (visualCard: VisualCard | null, runId: string | null) => void;
  setVisualPolishEnabled: (enabled: boolean) => void;
  clearMessages: () => void;
  reset: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'system',
      content: 'Welcome to ShaderLumen AI! Describe a shader you want to create, or select an intent mode to work with your current code.',
      timestamp: Date.now(),
    },
  ],
  activeIntent: 'auto',
  requestState: 'idle',
  lastError: null,
  providerName: 'Mock AI',
  modelName: 'mock-v1',
  candidateCount: loadCandidateCount(),
  maxAttempts: loadMaxAttempts(),
  telemetryStats: loadStats(),
  lastVisualCard: loadRunContext()?.visualCard ?? null,
  lastRunId: loadRunContext()?.runId ?? null,
  visualPolishEnabled: loadVisualPolish(),

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

  setMaxAttempts: (value) => {
    const clamped = clampMaxAttempts(value);
    persistMaxAttempts(clamped);
    set({ maxAttempts: clamped });
  },

  recordRunResult: (success, attempts) => {
    const next = applyRunResult(get().telemetryStats, success, attempts);
    persistStats(next);
    set({ telemetryStats: next });
  },

  setLastRunContext: (visualCard, runId) => {
    if (visualCard && runId) {
      persistRunContext({ visualCard, runId });
    } else {
      persistRunContext(null);
    }
    set({ lastVisualCard: visualCard, lastRunId: runId });
  },

  setVisualPolishEnabled: (enabled) => {
    persistVisualPolish(enabled);
    set({ visualPolishEnabled: enabled });
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
        content: 'Welcome to ShaderLumen AI! Describe a shader you want to create, or select an intent mode to work with your current code.',
        timestamp: Date.now(),
      },
    ],
    activeIntent: 'auto',
    requestState: 'idle',
    lastError: null,
  }),
}));
