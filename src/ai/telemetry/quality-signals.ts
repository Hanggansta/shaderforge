/**
 * Quality Signal Derivation
 * Deterministic quality signals derived from render metrics.
 * No LLM calls - pure threshold-based analysis.
 */

import type { RenderMetrics } from './types';

export type QualitySignalType =
  | 'too_dark'
  | 'too_bright'
  | 'low_contrast'
  | 'low_saturation'
  | 'flat_color'
  | 'no_visible_motion'
  | 'excessive_flicker'
  | 'unbalanced_composition'
  | 'healthy';

export interface QualitySignal {
  type: QualitySignalType;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  evidence: string;
}

// Conservative thresholds to avoid false positives
const THRESHOLDS = {
  // Brightness
  TOO_DARK: 0.08,
  TOO_DARK_MEDIUM: 0.04,
  TOO_BRIGHT: 0.92,
  TOO_BRIGHT_MEDIUM: 0.96,

  // Contrast
  LOW_CONTRAST: 0.06,
  LOW_CONTRAST_MEDIUM: 0.03,

  // Saturation
  LOW_SATURATION: 0.08,
  LOW_SATURATION_MEDIUM: 0.04,

  // Color variance
  FLAT_COLOR: 0.04,
  FLAT_COLOR_MEDIUM: 0.02,

  // Motion
  NO_MOTION: 0.005,
  NO_MOTION_MEDIUM: 0.002,

  // Flicker
  EXCESSIVE_FLICKER: 0.15,
  EXCESSIVE_FLICKER_MEDIUM: 0.25,

  // Composition (center/edge ratio)
  UNBALANCED_LOW: 0.4,
  UNBALANCED_HIGH: 1.8,
} as const;

/**
 * Derive quality signals from render metrics.
 * Returns an array of signals - empty if everything looks healthy.
 */
export function deriveQualitySignals(metrics: RenderMetrics): QualitySignal[] {
  const signals: QualitySignal[] = [];

  // Check brightness
  const brightnessSignal = checkBrightness(metrics.brightness);
  if (brightnessSignal) signals.push(brightnessSignal);

  // Check contrast
  const contrastSignal = checkContrast(metrics.contrast);
  if (contrastSignal) signals.push(contrastSignal);

  // Check saturation
  const saturationSignal = checkSaturation(metrics.saturation);
  if (saturationSignal) signals.push(saturationSignal);

  // Check color variance
  const colorSignal = checkColorVariance(metrics.colorVariance);
  if (colorSignal) signals.push(colorSignal);

  // Check motion
  const motionSignal = checkMotion(metrics.frameDelta);
  if (motionSignal) signals.push(motionSignal);

  // Check flicker
  const flickerSignal = checkFlicker(metrics.flickerScore);
  if (flickerSignal) signals.push(flickerSignal);

  // Check composition
  const compositionSignal = checkComposition(metrics.centerEdgeRatio);
  if (compositionSignal) signals.push(compositionSignal);

  // If no issues found, mark as healthy
  if (signals.length === 0) {
    signals.push({
      type: 'healthy',
      severity: 'low',
      confidence: 0.9,
      evidence: 'All metrics within normal ranges',
    });
  }

  return signals;
}

function checkBrightness(brightness: number): QualitySignal | null {
  if (brightness <= THRESHOLDS.TOO_DARK_MEDIUM) {
    return {
      type: 'too_dark',
      severity: 'high',
      confidence: 0.95,
      evidence: `Average brightness ${brightness.toFixed(3)} is extremely low (< ${THRESHOLDS.TOO_DARK_MEDIUM})`,
    };
  }
  if (brightness <= THRESHOLDS.TOO_DARK) {
    return {
      type: 'too_dark',
      severity: 'medium',
      confidence: 0.85,
      evidence: `Average brightness ${brightness.toFixed(3)} is very low (< ${THRESHOLDS.TOO_DARK})`,
    };
  }
  if (brightness >= THRESHOLDS.TOO_BRIGHT_MEDIUM) {
    return {
      type: 'too_bright',
      severity: 'high',
      confidence: 0.95,
      evidence: `Average brightness ${brightness.toFixed(3)} is extremely high (> ${THRESHOLDS.TOO_BRIGHT_MEDIUM})`,
    };
  }
  if (brightness >= THRESHOLDS.TOO_BRIGHT) {
    return {
      type: 'too_bright',
      severity: 'medium',
      confidence: 0.85,
      evidence: `Average brightness ${brightness.toFixed(3)} is very high (> ${THRESHOLDS.TOO_BRIGHT})`,
    };
  }
  return null;
}

function checkContrast(contrast: number): QualitySignal | null {
  if (contrast <= THRESHOLDS.LOW_CONTRAST_MEDIUM) {
    return {
      type: 'low_contrast',
      severity: 'high',
      confidence: 0.9,
      evidence: `Contrast ${contrast.toFixed(3)} is extremely low (< ${THRESHOLDS.LOW_CONTRAST_MEDIUM})`,
    };
  }
  if (contrast <= THRESHOLDS.LOW_CONTRAST) {
    return {
      type: 'low_contrast',
      severity: 'medium',
      confidence: 0.8,
      evidence: `Contrast ${contrast.toFixed(3)} is very low (< ${THRESHOLDS.LOW_CONTRAST})`,
    };
  }
  return null;
}

function checkSaturation(saturation: number): QualitySignal | null {
  if (saturation <= THRESHOLDS.LOW_SATURATION_MEDIUM) {
    return {
      type: 'low_saturation',
      severity: 'high',
      confidence: 0.9,
      evidence: `Saturation ${saturation.toFixed(3)} is extremely low (< ${THRESHOLDS.LOW_SATURATION_MEDIUM})`,
    };
  }
  if (saturation <= THRESHOLDS.LOW_SATURATION) {
    return {
      type: 'low_saturation',
      severity: 'medium',
      confidence: 0.8,
      evidence: `Saturation ${saturation.toFixed(3)} is very low (< ${THRESHOLDS.LOW_SATURATION})`,
    };
  }
  return null;
}

function checkColorVariance(colorVariance: number): QualitySignal | null {
  if (colorVariance <= THRESHOLDS.FLAT_COLOR_MEDIUM) {
    return {
      type: 'flat_color',
      severity: 'high',
      confidence: 0.85,
      evidence: `Color variance ${colorVariance.toFixed(3)} is extremely low (< ${THRESHOLDS.FLAT_COLOR_MEDIUM})`,
    };
  }
  if (colorVariance <= THRESHOLDS.FLAT_COLOR) {
    return {
      type: 'flat_color',
      severity: 'medium',
      confidence: 0.75,
      evidence: `Color variance ${colorVariance.toFixed(3)} is very low (< ${THRESHOLDS.FLAT_COLOR})`,
    };
  }
  return null;
}

function checkMotion(frameDelta: number): QualitySignal | null {
  if (frameDelta <= THRESHOLDS.NO_MOTION_MEDIUM) {
    return {
      type: 'no_visible_motion',
      severity: 'medium',
      confidence: 0.8,
      evidence: `Frame delta ${frameDelta.toFixed(4)} indicates no visible motion (< ${THRESHOLDS.NO_MOTION_MEDIUM})`,
    };
  }
  if (frameDelta <= THRESHOLDS.NO_MOTION) {
    return {
      type: 'no_visible_motion',
      severity: 'low',
      confidence: 0.7,
      evidence: `Frame delta ${frameDelta.toFixed(4)} indicates minimal motion (< ${THRESHOLDS.NO_MOTION})`,
    };
  }
  return null;
}

function checkFlicker(flickerScore: number): QualitySignal | null {
  if (flickerScore >= THRESHOLDS.EXCESSIVE_FLICKER_MEDIUM) {
    return {
      type: 'excessive_flicker',
      severity: 'high',
      confidence: 0.9,
      evidence: `Flicker score ${flickerScore.toFixed(3)} is very high (> ${THRESHOLDS.EXCESSIVE_FLICKER_MEDIUM})`,
    };
  }
  if (flickerScore >= THRESHOLDS.EXCESSIVE_FLICKER) {
    return {
      type: 'excessive_flicker',
      severity: 'medium',
      confidence: 0.8,
      evidence: `Flicker score ${flickerScore.toFixed(3)} is high (> ${THRESHOLDS.EXCESSIVE_FLICKER})`,
    };
  }
  return null;
}

function checkComposition(centerEdgeRatio: number): QualitySignal | null {
  if (centerEdgeRatio <= THRESHOLDS.UNBALANCED_LOW) {
    return {
      type: 'unbalanced_composition',
      severity: 'medium',
      confidence: 0.75,
      evidence: `Center/edge ratio ${centerEdgeRatio.toFixed(3)} indicates edge-heavy composition (< ${THRESHOLDS.UNBALANCED_LOW})`,
    };
  }
  if (centerEdgeRatio >= THRESHOLDS.UNBALANCED_HIGH) {
    return {
      type: 'unbalanced_composition',
      severity: 'medium',
      confidence: 0.75,
      evidence: `Center/edge ratio ${centerEdgeRatio.toFixed(3)} indicates center-heavy composition (> ${THRESHOLDS.UNBALANCED_HIGH})`,
    };
  }
  return null;
}
