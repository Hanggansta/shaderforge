/**
 * Visual Scorer
 * Deterministic visual scoring comparing rendered pixel data against
 * ShaderSpec expectations. Pure pixel math — no vision model required.
 */

import type { ShaderSpec, Palette } from '../schemas/shader-spec';
import { analyzePixels } from './analyze-pixels';

export interface ScoredMetric {
  score: number;
  reason: string;
}

export interface VisualScoreResult {
  score: number;
  breakdown: Record<string, ScoredMetric>;
}

interface PaletteProfile {
  r: number;
  g: number;
  b: number;
  saturation: number;
  brightness: number;
  rgbWeight: number;
  satWeight: number;
  brightWeight: number;
}

const PALETTE_PROFILES: Record<Palette, PaletteProfile> = {
  purple_blue:  { r: 0.4, g: 0.2, b: 0.8, saturation: 0.6, brightness: 0.4, rgbWeight: 1.0, satWeight: 0.8, brightWeight: 0.6 },
  deep_space:   { r: 0.1, g: 0.1, b: 0.3, saturation: 0.4, brightness: 0.15, rgbWeight: 0.6, satWeight: 0.6, brightWeight: 1.5 },
  neon_cyber:   { r: 0.7, g: 0.8, b: 0.9, saturation: 0.8, brightness: 0.7, rgbWeight: 0.4, satWeight: 1.5, brightWeight: 1.0 },
  warm_sunset:  { r: 0.9, g: 0.5, b: 0.2, saturation: 0.7, brightness: 0.5, rgbWeight: 1.0, satWeight: 0.8, brightWeight: 0.6 },
  gold_white:   { r: 0.9, g: 0.8, b: 0.6, saturation: 0.3, brightness: 0.8, rgbWeight: 0.8, satWeight: 0.6, brightWeight: 1.0 },
  monochrome:   { r: 0.5, g: 0.5, b: 0.5, saturation: 0.05, brightness: 0.5, rgbWeight: 0.2, satWeight: 2.0, brightWeight: 0.8 },
  ocean_deep:   { r: 0.05, g: 0.3, b: 0.5, saturation: 0.7, brightness: 0.3, rgbWeight: 0.8, satWeight: 1.0, brightWeight: 0.8 },
  fire_ember:   { r: 0.9, g: 0.3, b: 0.1, saturation: 0.8, brightness: 0.5, rgbWeight: 1.0, satWeight: 0.8, brightWeight: 0.6 },
  forest_earth: { r: 0.2, g: 0.5, b: 0.2, saturation: 0.5, brightness: 0.35, rgbWeight: 0.8, satWeight: 0.8, brightWeight: 0.8 },
  ice_crystal:  { r: 0.7, g: 0.85, b: 1.0, saturation: 0.2, brightness: 0.85, rgbWeight: 0.6, satWeight: 1.0, brightWeight: 1.0 },
  alien_bio:    { r: 0.3, g: 0.8, b: 0.4, saturation: 0.7, brightness: 0.5, rgbWeight: 0.6, satWeight: 1.2, brightWeight: 0.8 },
  retro_crt:    { r: 0.2, g: 0.9, b: 0.3, saturation: 0.8, brightness: 0.4, rgbWeight: 0.4, satWeight: 1.5, brightWeight: 0.8 },
  custom:       { r: 0.5, g: 0.5, b: 0.5, saturation: 0.5, brightness: 0.5, rgbWeight: 0.0, satWeight: 0.0, brightWeight: 0.0 },
};

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function computeAvgColor(pixels: Uint8Array): { r: number; g: number; b: number } {
  const pixelCount = pixels.length / 4;
  if (pixelCount === 0) return { r: 0, g: 0, b: 0 };
  let totalR = 0, totalG = 0, totalB = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    totalR += pixels[i] / 255;
    totalG += pixels[i + 1] / 255;
    totalB += pixels[i + 2] / 255;
  }
  return { r: totalR / pixelCount, g: totalG / pixelCount, b: totalB / pixelCount };
}

export function scoreColorAlignment(pixels: Uint8Array, width: number, height: number, spec: ShaderSpec): ScoredMetric {
  if (spec.color.palette === 'custom') return { score: 0.5, reason: 'Custom palette - no alignment check' };
  if (pixels.length === 0) return { score: 0, reason: 'No pixel data' };
  const profile = PALETTE_PROFILES[spec.color.palette];
  const metrics = analyzePixels(pixels, width, height);
  const avgColor = computeAvgColor(pixels);
  const rgbDist = Math.sqrt((avgColor.r - profile.r) ** 2 + (avgColor.g - profile.g) ** 2 + (avgColor.b - profile.b) ** 2);
  const rgbScore = Math.max(0, 1 - rgbDist / 1.5);
  const satDist = Math.abs(metrics.saturation - profile.saturation);
  const satScore = Math.max(0, 1 - satDist * 2);
  const brightDist = Math.abs(metrics.brightness - profile.brightness);
  const brightScore = Math.max(0, 1 - brightDist * 2);
  const totalWeight = profile.rgbWeight + profile.satWeight + profile.brightWeight;
  const weighted = rgbScore * profile.rgbWeight + satScore * profile.satWeight + brightScore * profile.brightWeight;
  const score = clamp01(weighted / totalWeight);
  return { score, reason: `Palette ${spec.color.palette}: color=${(rgbScore * 100).toFixed(0)}%, sat=${(satScore * 100).toFixed(0)}%, bright=${(brightScore * 100).toFixed(0)}%` };
}

export function scoreBrightness(pixels: Uint8Array, width: number, height: number, _spec: ShaderSpec): ScoredMetric {
  if (pixels.length === 0) return { score: 0, reason: 'No pixel data' };
  const metrics = analyzePixels(pixels, width, height);
  const brightness = metrics.brightness;
  let score: number;
  if (brightness < 0.05) score = 0.1;
  else if (brightness < 0.15) score = 0.4;
  else if (brightness < 0.3) score = 0.7;
  else if (brightness < 0.7) score = 0.9;
  else if (brightness < 0.85) score = 0.7;
  else score = 0.4;
  return { score, reason: `Brightness ${brightness.toFixed(3)} — ${brightness < 0.15 ? 'too dark' : brightness > 0.85 ? 'washed out' : 'good range'}` };
}

export function scoreContrast(pixels: Uint8Array, width: number, height: number, _spec: ShaderSpec): ScoredMetric {
  if (pixels.length === 0) return { score: 0, reason: 'No pixel data' };
  const metrics = analyzePixels(pixels, width, height);
  const contrast = metrics.contrast;
  let score: number;
  if (contrast < 0.05) score = 0.2;
  else if (contrast < 0.1) score = 0.5;
  else if (contrast < 0.4) score = 0.9;
  else score = 0.7;
  return { score, reason: `Contrast ${contrast.toFixed(3)} — ${contrast < 0.05 ? 'flat' : contrast > 0.4 ? 'very high' : 'good range'}` };
}

export function scoreMotion(frame1: Uint8Array, frame2: Uint8Array, width: number, height: number, spec: ShaderSpec): ScoredMetric {
  if (frame1.length === 0 || frame2.length === 0) return { score: 0, reason: 'No pixel data' };
  const metrics = analyzePixels(frame2, width, height, frame1);
  const isStatic = spec.motion.type === 'static';
  const frameDelta = metrics.frameDelta;

  if (isStatic) {
    const score = frameDelta < 0.01 ? 1.0 : frameDelta < 0.05 ? 0.7 : 0.3;
    return { score, reason: `Static shader, frame delta ${frameDelta.toFixed(4)} — ${frameDelta < 0.01 ? 'good (still)' : 'unexpected motion'}` };
  }
  const score = frameDelta < 0.001 ? 0.2 : frameDelta < 0.1 ? 0.8 : 0.5;
  return { score, reason: `Animated shader (${spec.motion.type}), frame delta ${frameDelta.toFixed(4)} — ${frameDelta < 0.001 ? 'no visible motion' : 'motion detected'}` };
}

export function computeVisualScore(pixels: Uint8Array, width: number, height: number, spec: ShaderSpec, frame2?: Uint8Array): VisualScoreResult {
  const color = scoreColorAlignment(pixels, width, height, spec);
  const brightness = scoreBrightness(pixels, width, height, spec);
  const contrast = scoreContrast(pixels, width, height, spec);
  const breakdown: Record<string, ScoredMetric> = { color, brightness, contrast };
  let totalWeight = 0.3 + 0.3 + 0.2;
  let weightedSum = color.score * 0.3 + brightness.score * 0.3 + contrast.score * 0.2;
  if (frame2 && spec.motion.type !== 'static') {
    const motion = scoreMotion(pixels, frame2, width, height, spec);
    breakdown.motion = motion;
    weightedSum += motion.score * 0.2;
    totalWeight += 0.2;
  }
  const score = Math.round(clamp01(weightedSum / totalWeight) * 100);
  return { score, breakdown };
}
