/**
 * Pixel Analysis for Render Telemetry
 * Captures frame data from WebGL canvas and computes render metrics.
 * No vision model - pure pixel math.
 */

import type { RenderMetrics } from './types';

/** Maximum dimension for telemetry capture to limit memory usage */
const MAX_CAPTURE_DIMENSION = 512;

export interface CapturedFrame {
  pixels: Uint8Array;
  width: number;
  height: number;
}

/**
 * Capture a single frame from the WebGL canvas and return RGBA pixel data.
 * Automatically downscales if canvas exceeds MAX_CAPTURE_DIMENSION.
 */
export function captureFrame(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): CapturedFrame | null {
  try {
    // Downscale if canvas is too large to limit memory usage
    let readWidth = width;
    let readHeight = height;
    if (width > MAX_CAPTURE_DIMENSION || height > MAX_CAPTURE_DIMENSION) {
      const scale = MAX_CAPTURE_DIMENSION / Math.max(width, height);
      readWidth = Math.floor(width * scale);
      readHeight = Math.floor(height * scale);
    }

    const pixels = new Uint8Array(readWidth * readHeight * 4);
    gl.readPixels(0, 0, readWidth, readHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return { pixels, width: readWidth, height: readHeight };
  } catch {
    return null;
  }
}

/**
 * Compute render metrics from pixel data.
 * Expects RGBA pixels in WebGL readPixels format (bottom-left origin).
 */
export function analyzePixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  previousPixels?: Uint8Array | null
): RenderMetrics {
  const pixelCount = width * height;
  let totalBrightness = 0;
  let totalSaturation = 0;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let centerBrightness = 0;
  let edgeBrightness = 0;
  let centerCount = 0;
  let edgeCount = 0;

  const centerXMin = Math.floor(width * 0.25);
  const centerXMax = Math.floor(width * 0.75);
  const centerYMin = Math.floor(height * 0.25);
  const centerYMax = Math.floor(height * 0.75);

  const brightnessValues: number[] = [];

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = pixels[offset] / 255;
    const g = pixels[offset + 1] / 255;
    const b = pixels[offset + 2] / 255;

    // Perceived brightness (ITU-R BT.709)
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    totalBrightness += brightness;
    brightnessValues.push(brightness);

    // Saturation (HSL approximation)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    totalSaturation += saturation;

    totalR += r;
    totalG += g;
    totalB += b;

    // Center vs edge analysis
    const x = i % width;
    const y = Math.floor(i / width);
    const isCenter = x >= centerXMin && x < centerXMax && y >= centerYMin && y < centerYMax;
    const isEdge = x < width * 0.1 || x >= width * 0.9 || y < height * 0.1 || y >= height * 0.9;

    if (isCenter) {
      centerBrightness += brightness;
      centerCount++;
    }
    if (isEdge) {
      edgeBrightness += brightness;
      edgeCount++;
    }
  }

  // Averages
  const avgBrightness = totalBrightness / pixelCount;
  const avgSaturation = totalSaturation / pixelCount;
  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  const avgCenter = centerCount > 0 ? centerBrightness / centerCount : 0;
  const avgEdge = edgeCount > 0 ? edgeBrightness / edgeCount : 0;

  // Contrast (standard deviation of brightness)
  let brightnessVariance = 0;
  for (const b of brightnessValues) {
    const diff = b - avgBrightness;
    brightnessVariance += diff * diff;
  }
  const contrast = Math.sqrt(brightnessVariance / pixelCount);

  // Color variance (variance of RGB channels)
  let colorVariance = 0;
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = pixels[offset] / 255;
    const g = pixels[offset + 1] / 255;
    const b = pixels[offset + 2] / 255;
    const dr = r - avgR;
    const dg = g - avgG;
    const db = b - avgB;
    colorVariance += (dr * dr + dg * dg + db * db) / 3;
  }
  colorVariance = Math.sqrt(colorVariance / pixelCount);

  // Frame delta (motion)
  let frameDelta = 0;
  if (previousPixels && previousPixels.length === pixels.length) {
    for (let i = 0; i < pixels.length; i += 4) {
      const dr = (pixels[i] - previousPixels[i]) / 255;
      const dg = (pixels[i + 1] - previousPixels[i + 1]) / 255;
      const db = (pixels[i + 2] - previousPixels[i + 2]) / 255;
      frameDelta += Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3);
    }
    frameDelta = frameDelta / pixelCount;
  }

  // Center/edge ratio
  const centerEdgeRatio = avgEdge > 0 ? Math.min(avgCenter / avgEdge, 2) : 1;

  return {
    brightness: clamp(avgBrightness, 0, 1),
    contrast: clamp(contrast, 0, 1),
    saturation: clamp(avgSaturation, 0, 1),
    colorVariance: clamp(colorVariance, 0, 1),
    frameDelta: clamp(frameDelta, 0, 1),
    flickerScore: 0, // Will be computed from multiple frames
    centerEdgeRatio: clamp(centerEdgeRatio, 0, 2),
  };
}

/**
 * Compute flicker score from multiple frame brightness values.
 * High value = temporal brightness instability.
 */
export function computeFlickerScore(frameBrightnesses: number[]): number {
  if (frameBrightnesses.length < 2) return 0;

  let totalVariance = 0;
  const mean = frameBrightnesses.reduce((a, b) => a + b, 0) / frameBrightnesses.length;

  for (const b of frameBrightnesses) {
    const diff = b - mean;
    totalVariance += diff * diff;
  }

  return clamp(Math.sqrt(totalVariance / frameBrightnesses.length), 0, 1);
}

/**
 * Compute average brightness from pixel data.
 */
export function computeBrightness(pixels: Uint8Array): number {
  const pixelCount = pixels.length / 4;
  let total = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] / 255;
    const g = pixels[i + 1] / 255;
    const b = pixels[i + 2] / 255;
    total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  return total / pixelCount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
