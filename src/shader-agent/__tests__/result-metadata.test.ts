import { describe, it, expect } from 'vitest';
import { buildGenerationSummary, buildTelemetrySummary } from '../integration/result-metadata';
import type { GenerateResult } from '../workflows/generate-shader';

const MOCK_RESULT = {
  code: 'void mainImage() {}',
  source: 'generated',
  attempts: 2,
  visualCard: {
    intent: 'create',
    scene: { type: 'nebula', composition: 'fullscreen' },
    material: { type: 'nebula_gas' },
    style: { mood: 'dreamy' },
    motion: { type: 'flow' },
    depth: { approach: 'volumetric' },
    lighting: { model: 'emissive' },
    color: { palette: 'purple_blue' },
    interaction: { type: 'time_only' },
    constraints: {
      target: 'webgl2',
      performance: 'desktop_balanced',
      maxIterations: 48,
      allowRaymarching: false,
      allowTextures: false,
    },
  },
  shaderPlan: {
    baseTechnique: 'fbm_nebula',
    coordinateSystem: 'cartesian',
    noise: 'fbm',
    motion: 'time_drift',
    colorMethod: 'palette_gradient',
    effects: [],
    composition: 'fullscreen_texture',
    performance: 'desktop_balanced',
    maxLoopBudget: 48,
    avoid: [],
    promptHints: [],
  },
  references: [{ id: 'g1', kind: 'golden', title: 'Nebula Flow', summary: '', when: '', body: '', tags: [] }],
  compileReport: { ok: true, errors: [], rawLog: '' },
  runId: 'run-test',
  compileAttempts: [{ ok: false, errors: [], rawLog: '' }, { ok: true, errors: [], rawLog: '' }],
  visualScore: 72,
  visualBreakdown: {
    brightness: { score: 0.4, reason: 'too dark' },
    contrast: { score: 0.8, reason: 'good range' },
    color: { score: 0.7, reason: 'palette ok' },
  },
} as unknown as GenerateResult;

describe('result metadata builders', () => {
  it('buildGenerationSummary maps visual card fields', () => {
    const summary = buildGenerationSummary(MOCK_RESULT, { candidateCount: 2 });
    expect(summary.sceneType).toBe('nebula');
    expect(summary.mood).toBe('dreamy');
    expect(summary.palette).toBe('purple_blue');
    expect(summary.attempts).toBe(2);
    expect(summary.candidateCount).toBe(2);
    expect(summary.visualScore).toBe(72);
    expect(summary.visualWeakest).toContain('brightness');
  });

  it('buildTelemetrySummary reports repair attempts', () => {
    const telemetry = buildTelemetrySummary(MOCK_RESULT);
    expect(telemetry?.repairAttempted).toBe(true);
    expect(telemetry?.repairSuccess).toBe(true);
    expect(telemetry?.qualityLabel).toContain('dark');
  });
});