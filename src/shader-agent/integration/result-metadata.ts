/**
 * Build GenerationSummary + TelemetrySummary from workflow results.
 */

import type { GenerationSummary, TelemetrySummary } from '../../store/aiStore';
import type { GenerateResult } from '../workflows/generate-shader';
import type { PatchResult } from '../workflows/patch-shader';
import type { VisualCard } from '../schemas/visual-card';
import { pickWeakestMetric } from '../tools/candidate-eval';

type WorkflowResult = GenerateResult | PatchResult;

export function fallbackVisualCard(userPrompt: string): VisualCard {
  return {
    intent: 'modify',
    scene: { type: 'abstract', composition: 'fullscreen' },
    material: { type: 'abstract' },
    style: { mood: 'minimal' },
    motion: { type: 'flow' },
    depth: { approach: 'layered' },
    lighting: { model: 'ambient' },
    color: { palette: 'monochrome' },
    interaction: { type: 'time_only' },
    constraints: {
      target: 'webgl2',
      performance: 'desktop_balanced',
      maxIterations: 48,
      allowRaymarching: false,
      allowTextures: false,
    },
    ...(userPrompt ? { scene: { type: 'abstract', subject: userPrompt.slice(0, 80), composition: 'fullscreen' } } : {}),
  };
}

export function buildGenerationSummary(
  result: WorkflowResult,
  options?: { candidateCount?: number },
): GenerationSummary {
  const vc = result.visualCard;
  const weakest = result.visualBreakdown
    ? pickWeakestMetric(result.visualBreakdown)
    : null;

  return {
    sceneType: vc.scene.type,
    mood: vc.style.mood,
    palette: vc.color.palette,
    baseTechnique: result.references[0]?.title ?? 'none',
    motionType: vc.motion.type,
    goldenExampleCount: result.references.length,
    attempts: result.attempts,
    ...(options?.candidateCount !== undefined ? { candidateCount: options.candidateCount } : {}),
    ...(result.visualScore !== undefined ? { visualScore: Math.round(result.visualScore) } : {}),
    ...(weakest ? { visualWeakest: `${weakest.name}: ${weakest.metric.reason}` } : {}),
  };
}

export function buildTelemetrySummary(result: WorkflowResult): TelemetrySummary | undefined {
  if (!result.visualBreakdown && result.attempts <= 1 && result.compileReport.ok) {
    return undefined;
  }

  const weakest = result.visualBreakdown
    ? pickWeakestMetric(result.visualBreakdown)
    : null;

  const brightness = result.visualBreakdown?.brightness?.score;
  const contrast = result.visualBreakdown?.contrast?.score;
  const color = result.visualBreakdown?.color?.score;

  const repairAttempted = result.attempts > 1;
  const repairSuccess = repairAttempted && result.compileReport.ok;

  let qualityLabel = 'healthy';
  let qualitySeverity: TelemetrySummary['qualitySeverity'] = 'low';

  if (weakest) {
    qualityLabel = weakest.metric.reason;
    qualitySeverity = weakest.metric.score < 0.4 ? 'high' : weakest.metric.score < 0.6 ? 'medium' : 'low';
  } else if (!result.compileReport.ok) {
    qualityLabel = 'compile failed';
    qualitySeverity = 'high';
  }

  return {
    qualityLabel,
    qualitySeverity,
    repairAttempted,
    repairSuccess,
    repairSummary: repairAttempted
      ? repairSuccess
        ? `Passed after ${result.attempts} compile attempts`
        : `Failed after ${result.attempts} compile attempts`
      : undefined,
    ...(brightness !== undefined && contrast !== undefined && color !== undefined
      ? {
          metrics: {
            brightness,
            contrast,
            saturation: color,
          },
        }
      : {}),
  };
}