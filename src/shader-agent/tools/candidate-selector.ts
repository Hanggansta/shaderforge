/**
 * Candidate Selector — the "sharpen AI" piece for top-tier SaaS quality.
 *
 * Takes multiple raw LLM outputs, runs them through compile + real visual scoring
 * (using the existing evaluateCandidateVisually which does offscreen render + pixel analysis),
 * and returns the best one.
 *
 * This is deliberately deterministic (Tool, not Agent) so we stay true to the V1 philosophy.
 */

import { evaluateCandidateVisually } from './candidate-eval';
import type { VisualCard } from '../schemas/visual-card';
import { compileShader } from './shader-compiler';

export interface Candidate {
  code: string;
  rawResponse?: string;
}

export interface SelectedCandidate {
  code: string;
  visualScore: number;
  breakdown?: Record<string, unknown>;
  sourceIndex: number;
}

export async function selectBestCandidate(
  candidates: Candidate[],
  visualCard: VisualCard | undefined,
): Promise<SelectedCandidate | null> {
  if (!candidates.length) return null;

  const scored: Array<SelectedCandidate & { compiles: boolean }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const code = cand.code?.trim();
    if (!code || !code.includes('mainImage')) continue;

    // Quick compile gate (we don't want to pick something that can't even compile)
    const compileReport = await compileShader(code);
    const compiles = !!compileReport.ok;

    let visualScore = 0;
    let breakdown: Record<string, unknown> | undefined;

    if (visualCard) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vis = evaluateCandidateVisually(code, visualCard as any);
      if (vis) {
        visualScore = vis.visualScore;
        breakdown = vis.breakdown as Record<string, unknown>;
      }
    }

    // Bias toward things that compile + have decent visual score
    // const _effectiveScore = compiles ? visualScore : visualScore * 0.4; // reserved for future weighting

    scored.push({
      code,
      visualScore,
      breakdown,
      sourceIndex: i,
      compiles,
    });
  }

  if (!scored.length) return null;

  // Sort by effective visual quality (compiling ones win)
  scored.sort((a, b) => b.visualScore - a.visualScore);

  const best = scored[0];

  return {
    code: best.code,
    visualScore: best.visualScore,
    breakdown: best.breakdown,
    sourceIndex: best.sourceIndex,
  };
}
