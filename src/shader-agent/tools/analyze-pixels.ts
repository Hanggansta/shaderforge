/**
 * Render Metrics — pixel analysis output.
 */

export interface RenderMetrics {
  brightness: number;
  contrast: number;
  saturation: number;
  colorVariance: number;
  frameDelta: number;
  flickerScore: number;
  centerEdgeRatio: number;
}

export interface CapturedFrame {
  pixels: Uint8Array;
  width: number;
  height: number;
}

const MAX_CAPTURE_DIMENSION = 512;

export function captureFrame(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): CapturedFrame | null {
  try {
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

    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    totalBrightness += brightness;
    brightnessValues.push(brightness);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    totalSaturation += saturation;

    totalR += r;
    totalG += g;
    totalB += b;

    const x = i % width;
    const y = Math.floor(i / width);
    const isCenter = x >= centerXMin && x < centerXMax && y >= centerYMin && y < centerYMax;
    const isEdge = x < width * 0.1 || x >= width * 0.9 || y < height * 0.1 || y >= height * 0.9;

    if (isCenter) { centerBrightness += brightness; centerCount++; }
    if (isEdge) { edgeBrightness += brightness; edgeCount++; }
  }

  const avgBrightness = totalBrightness / pixelCount;
  const avgSaturation = totalSaturation / pixelCount;
  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  const avgCenter = centerCount > 0 ? centerBrightness / centerCount : 0;
  const avgEdge = edgeCount > 0 ? edgeBrightness / edgeCount : 0;

  let brightnessVariance = 0;
  for (const b of brightnessValues) {
    const diff = b - avgBrightness;
    brightnessVariance += diff * diff;
  }
  const contrast = Math.sqrt(brightnessVariance / pixelCount);

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

  const centerEdgeRatio = avgEdge > 0 ? Math.min(avgCenter / avgEdge, 2) : 1;

  return {
    brightness: clamp(avgBrightness, 0, 1),
    contrast: clamp(contrast, 0, 1),
    saturation: clamp(avgSaturation, 0, 1),
    colorVariance: clamp(colorVariance, 0, 1),
    frameDelta: clamp(frameDelta, 0, 1),
    flickerScore: 0,
    centerEdgeRatio: clamp(centerEdgeRatio, 0, 2),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
