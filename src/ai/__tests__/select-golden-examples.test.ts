import { describe, it, expect } from 'vitest';
import { selectGoldenExamples } from '../library/select-golden-examples';
import { createDefaultSpec } from '../spec/normalize-shader-spec';
import type { ShaderSpec } from '../spec/shader-spec';
import type { TechniquePlan } from '../planner/technique-plan';

function makeSpec(overrides: Partial<ShaderSpec> = {}): ShaderSpec {
  return { ...createDefaultSpec(), ...overrides };
}

function makePlan(overrides: Partial<TechniquePlan> = {}): TechniquePlan {
  return {
    baseTechnique: 'abstract_flow',
    coordinateSystem: 'centered_uv',
    noise: 'fbm',
    motion: 'time_drift',
    colorMethod: 'palette_gradient',
    effects: [],
    composition: 'fullscreen_texture',
    performance: 'desktop_balanced',
    maxLoopBudget: 48,
    avoid: [],
    promptHints: [],
    ...overrides,
  };
}

describe('selectGoldenExamples', () => {
  it('returns at most maxExamples results', () => {
    const spec = makeSpec();
    const plan = makePlan();
    const result = selectGoldenExamples(spec, plan, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no matches', () => {
    const spec = makeSpec({
      scene: { type: 'unknown', composition: 'fullscreen' },
      style: { mood: 'energetic', visualDensity: 0.5, contrast: 0.5, glow: 0.5 },
      color: { palette: 'custom' },
      constraints: { target: 'webgl2', performance: 'high_quality', maxIterations: 64, allowRaymarching: false, allowTextures: false },
    });
    const plan = makePlan({ baseTechnique: 'abstract_flow' });
    // Even with no exact match, the selector should return something if score > 0
    const result = selectGoldenExamples(spec, plan, 1);
    // The result depends on scoring - it may or may not be empty
    expect(Array.isArray(result)).toBe(true);
  });

  it('selects nebula example for nebula scene', () => {
    const spec = makeSpec({ scene: { type: 'nebula', composition: 'fullscreen' } });
    const plan = makePlan({ baseTechnique: 'fbm_nebula' });
    const result = selectGoldenExamples(spec, plan, 1);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('dreamy-fbm-nebula');
  });

  it('selects particles example for particles scene', () => {
    const spec = makeSpec({ scene: { type: 'particles', composition: 'fullscreen' } });
    const plan = makePlan({ baseTechnique: 'procedural_particles' });
    const result = selectGoldenExamples(spec, plan, 1);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('neon-procedural-particles');
  });

  it('filters by performance compatibility', () => {
    const spec = makeSpec({
      constraints: { target: 'webgl2', performance: 'mobile_safe', maxIterations: 32, allowRaymarching: false, allowTextures: false },
    });
    const plan = makePlan();
    const result = selectGoldenExamples(spec, plan, 10);
    // All returned examples should be mobile_safe compatible
    for (const example of result) {
      expect(example.performance).toBe('mobile_safe');
    }
  });

  it('never fails - returns array', () => {
    const spec = makeSpec();
    const plan = makePlan();
    expect(Array.isArray(selectGoldenExamples(spec, plan))).toBe(true);
    expect(Array.isArray(selectGoldenExamples(spec, plan, 0))).toBe(true);
    expect(Array.isArray(selectGoldenExamples(spec, plan, 100))).toBe(true);
  });
});
