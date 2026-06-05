/**
 * Screenshot Renderer (Tool 3)
 *
 * V1 (browser) implementation uses the local candidate-eval. We return raw
 * pixel arrays (since we don't have filesystem access in the browser).
 * Visual scoring is exposed alongside the screenshots, same code path.
 */

import {
  evaluateCandidateVisually,
  __resetCandidateEvaluator as _resetForTests,
} from './candidate-eval';
import type { ShaderSpec } from '../schemas/shader-spec';
import type { ScreenshotFrame } from '../schemas/shader-result';
import type { VisualScoreBreakdown } from '../schemas/visual-card';

export interface ScreenshotOptions {
  width: number;
  height: number;
  times: number[];
  spec?: ShaderSpec;
}

export interface ScreenshotResult {
  frames: ScreenshotFrame[];
  visualScore?: number;
  visualBreakdown?: VisualScoreBreakdown;
}

export async function renderScreenshots(
  code: string,
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  const t = options.times[options.times.length - 1] ?? 0;
  const visual = evaluateCandidateVisually(code, options.spec);
  const fallbackData = new Uint8ClampedArray(options.width * options.height * 4);
  const frames: ScreenshotFrame[] = [
    { t, width: options.width, height: options.height, data: fallbackData },
  ];
  const result: ScreenshotResult = { frames };
  if (visual) {
    result.visualScore = visual.visualScore;
    result.visualBreakdown = visual.breakdown as VisualScoreBreakdown;
  }
  return result;
}

export const __resetScreenshotEvaluator = _resetForTests;
