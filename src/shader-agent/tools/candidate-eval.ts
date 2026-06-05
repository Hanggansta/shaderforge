/**
 * Candidate Visual Evaluator
 *
 * Bridges the offscreen renderer and the visual scorer so the candidate
 * loop can rank shaders by what they actually LOOK like (palette alignment,
 * brightness, contrast, motion vs static intent) instead of just compile +
 * keyword heuristics.
 */

import type { ShaderSpec } from '../schemas/shader-spec';
import {
  createOffscreenRenderer,
  isOffscreenRendererAvailable,
  type OffscreenRenderer,
} from '../../services/shader/offscreen-renderer';
import { computeVisualScore, type ScoredMetric } from './visual-scorer';

export interface CandidateVisualEvaluation {
  visualScore: number;
  breakdown: Record<string, ScoredMetric>;
  reason?: string;
}

const DEFAULT_EVAL_WIDTH = 256;
const DEFAULT_EVAL_HEIGHT = 256;
const FRAME_TIME_A = 0.0;
const FRAME_TIME_B = 1.0;

let sharedRenderer: OffscreenRenderer | null = null;
let sharedRendererTried = false;

function getSharedRenderer(): OffscreenRenderer | null {
  if (sharedRenderer) return sharedRenderer;
  if (sharedRendererTried) return null;
  sharedRendererTried = true;

  if (!isOffscreenRendererAvailable()) return null;

  sharedRenderer = createOffscreenRenderer({
    width: DEFAULT_EVAL_WIDTH,
    height: DEFAULT_EVAL_HEIGHT,
  });
  return sharedRenderer;
}

export function __resetCandidateEvaluator(): void {
  if (sharedRenderer) {
    try { sharedRenderer.dispose(); } catch { /* ignore */ }
  }
  sharedRenderer = null;
  sharedRendererTried = false;
}

export function evaluateCandidateVisually(
  code: string,
  spec: ShaderSpec | undefined,
): CandidateVisualEvaluation | null {
  if (!spec) return null;

  const renderer = getSharedRenderer();
  if (!renderer) return null;

  try {
    const compile = renderer.compile(code);
    if (!compile.success) return null;

    const frameA = renderer.render(FRAME_TIME_A);
    const frameB = renderer.render(FRAME_TIME_B);
    if (!frameA || !frameB) return null;

    const result = computeVisualScore(
      frameA.pixels,
      frameA.width,
      frameA.height,
      spec,
      frameB.pixels,
    );

    return {
      visualScore: result.score,
      breakdown: result.breakdown,
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.debug('[CandidateVisualEval] Render/score failed:', err);
    }
    return null;
  }
}

export function pickWeakestMetric(
  breakdown: Record<string, ScoredMetric>,
): { name: string; metric: ScoredMetric } | null {
  let worst: { name: string; metric: ScoredMetric } | null = null;
  for (const [name, metric] of Object.entries(breakdown)) {
    if (!worst || metric.score < worst.metric.score) {
      worst = { name, metric };
    }
  }
  if (!worst || worst.metric.score >= 0.7) return null;
  return worst;
}
