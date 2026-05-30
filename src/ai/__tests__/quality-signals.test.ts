import { describe, it, expect } from 'vitest';
import { deriveQualitySignals } from '../telemetry/quality-signals';
import type { RenderMetrics } from '../telemetry/types';

function makeMetrics(overrides: Partial<RenderMetrics> = {}): RenderMetrics {
  return {
    brightness: 0.5,
    contrast: 0.3,
    saturation: 0.5,
    colorVariance: 0.3,
    frameDelta: 0.05,
    flickerScore: 0.05,
    centerEdgeRatio: 1.0,
    ...overrides,
  };
}

describe('deriveQualitySignals', () => {
  it('returns healthy signal for normal metrics', () => {
    const signals = deriveQualitySignals(makeMetrics());
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('healthy');
  });

  it('detects too_dark at high severity', () => {
    const signals = deriveQualitySignals(makeMetrics({ brightness: 0.03 }));
    const darkSignal = signals.find(s => s.type === 'too_dark');
    expect(darkSignal).toBeDefined();
    expect(darkSignal!.severity).toBe('high');
  });

  it('detects too_dark at medium severity', () => {
    const signals = deriveQualitySignals(makeMetrics({ brightness: 0.06 }));
    const darkSignal = signals.find(s => s.type === 'too_dark');
    expect(darkSignal).toBeDefined();
    expect(darkSignal!.severity).toBe('medium');
  });

  it('detects too_bright at high severity', () => {
    const signals = deriveQualitySignals(makeMetrics({ brightness: 0.97 }));
    const brightSignal = signals.find(s => s.type === 'too_bright');
    expect(brightSignal).toBeDefined();
    expect(brightSignal!.severity).toBe('high');
  });

  it('detects low_contrast at high severity', () => {
    const signals = deriveQualitySignals(makeMetrics({ contrast: 0.02 }));
    const contrastSignal = signals.find(s => s.type === 'low_contrast');
    expect(contrastSignal).toBeDefined();
    expect(contrastSignal!.severity).toBe('high');
  });

  it('detects low_saturation', () => {
    const signals = deriveQualitySignals(makeMetrics({ saturation: 0.03 }));
    const satSignal = signals.find(s => s.type === 'low_saturation');
    expect(satSignal).toBeDefined();
  });

  it('detects flat_color', () => {
    const signals = deriveQualitySignals(makeMetrics({ colorVariance: 0.01 }));
    const flatSignal = signals.find(s => s.type === 'flat_color');
    expect(flatSignal).toBeDefined();
  });

  it('detects no_visible_motion', () => {
    const signals = deriveQualitySignals(makeMetrics({ frameDelta: 0.001 }));
    const motionSignal = signals.find(s => s.type === 'no_visible_motion');
    expect(motionSignal).toBeDefined();
  });

  it('detects excessive_flicker at high severity', () => {
    const signals = deriveQualitySignals(makeMetrics({ flickerScore: 0.3 }));
    const flickerSignal = signals.find(s => s.type === 'excessive_flicker');
    expect(flickerSignal).toBeDefined();
    expect(flickerSignal!.severity).toBe('high');
  });

  it('detects unbalanced_composition (edge-heavy)', () => {
    const signals = deriveQualitySignals(makeMetrics({ centerEdgeRatio: 0.3 }));
    const compSignal = signals.find(s => s.type === 'unbalanced_composition');
    expect(compSignal).toBeDefined();
  });

  it('detects unbalanced_composition (center-heavy)', () => {
    const signals = deriveQualitySignals(makeMetrics({ centerEdgeRatio: 2.0 }));
    const compSignal = signals.find(s => s.type === 'unbalanced_composition');
    expect(compSignal).toBeDefined();
  });

  it('detects multiple issues simultaneously', () => {
    const signals = deriveQualitySignals(makeMetrics({
      brightness: 0.03,
      contrast: 0.02,
      saturation: 0.03,
    }));
    expect(signals.length).toBeGreaterThan(1);
    expect(signals.some(s => s.type === 'too_dark')).toBe(true);
    expect(signals.some(s => s.type === 'low_contrast')).toBe(true);
    expect(signals.some(s => s.type === 'low_saturation')).toBe(true);
  });
});
