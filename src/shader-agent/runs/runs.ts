/**
 * Run Artifacts — in-memory per-generation artifact store.
 *
 * Plan reference: "runs/2026-06-05-blackhole-001/{visual-card.json, shader-plan.json, ...}"
 *
 * In V1 we don't have a filesystem (browser), so we keep runs in memory.
 * Each run captures: visualCard, shaderPlan, references, code, compileReport,
 * and optional screenshots. The store is append-only and capped at
 * `MAX_RUNS` to avoid unbounded memory growth.
 *
 * V2 (Node + Playwright) can replace this with a real filesystem store
 * by implementing the same `RunsStore` interface.
 */

import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import type { ReferenceCard } from '../schemas/reference-card';
import type { CompileReport } from '../schemas/compile-report';
import type { ScreenshotFrame } from '../schemas/shader-result';

export interface RunArtifact {
  id: string;
  createdAt: number;
  userPrompt: string;
  visualCard: VisualCard;
  shaderPlan: ShaderPlan;
  references: ReferenceCard[];
  /** Each compile attempt's outcome. */
  compileAttempts: CompileReport[];
  /** The final, compile-passing code. */
  finalCode: string | null;
  /** Number of attempts to get here. */
  attempts: number;
  /** True if the run produced a compile-passing shader. */
  success: boolean;
  /** Optional visual score. */
  visualScore?: number;
  /** Optional screenshot frames. */
  screenshots?: ScreenshotFrame[];
}

export interface RunsStore {
  save(run: RunArtifact): void;
  list(): RunArtifact[];
  get(id: string): RunArtifact | null;
  clear(): void;
}

const MAX_RUNS = 20;

export class InMemoryRunsStore implements RunsStore {
  private runs: RunArtifact[] = [];

  save(run: RunArtifact): void {
    this.runs.unshift(run);
    if (this.runs.length > MAX_RUNS) {
      this.runs.length = MAX_RUNS;
    }
  }

  list(): RunArtifact[] {
    return this.runs.slice();
  }

  get(id: string): RunArtifact | null {
    return this.runs.find((r) => r.id === id) ?? null;
  }

  clear(): void {
    this.runs = [];
  }
}

/** Default singleton. */
export const runsStore: RunsStore = new InMemoryRunsStore();

/** Test helper. */
export function __resetRunsStore(): void {
  runsStore.clear();
}
