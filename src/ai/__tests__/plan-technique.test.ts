import { describe, it, expect } from 'vitest';
import { planTechnique } from '../planner/plan-technique';
import { createDefaultSpec } from '../spec/normalize-shader-spec';
import type { ShaderSpec } from '../spec/shader-spec';

function makeSpec(overrides: Partial<ShaderSpec> = {}): ShaderSpec {
  return { ...createDefaultSpec(), ...overrides };
}

describe('planTechnique', () => {
  it('maps nebula scene to fbm_nebula technique', () => {
    const spec = makeSpec({ scene: { type: 'nebula', composition: 'fullscreen' } });
    const plan = planTechnique(spec);
    expect(plan.baseTechnique).toBe('fbm_nebula');
    expect(plan.coordinateSystem).toBe('centered_uv');
    expect(plan.noise).toBe('domain_warped_fbm');
  });

  it('maps particles scene to procedural_particles', () => {
    const spec = makeSpec({ scene: { type: 'particles', composition: 'fullscreen' } });
    const plan = planTechnique(spec);
    expect(plan.baseTechnique).toBe('procedural_particles');
  });

  it('maps tunnel scene to polar_tunnel with polar coordinates', () => {
    const spec = makeSpec({ scene: { type: 'tunnel', composition: 'fullscreen' } });
    const plan = planTechnique(spec);
    expect(plan.baseTechnique).toBe('polar_tunnel');
    expect(plan.coordinateSystem).toBe('polar');
  });

  it('maps unknown scene to abstract_flow', () => {
    const spec = makeSpec({ scene: { type: 'unknown', composition: 'fullscreen' } });
    const plan = planTechnique(spec);
    expect(plan.baseTechnique).toBe('abstract_flow');
  });

  it('uses spec.motion.type when valid', () => {
    const spec = makeSpec({
      scene: { type: 'abstract', composition: 'fullscreen' },
      motion: { type: 'swirl', speed: 0.5, smoothness: 0.5 },
    });
    const plan = planTechnique(spec);
    expect(plan.motion).toBe('swirl_flow');
  });

  it('maps palette to color method', () => {
    const spec = makeSpec({ color: { palette: 'neon_cyber' } });
    const plan = planTechnique(spec);
    expect(plan.colorMethod).toBe('neon_ramp');
  });

  it('adds soft_glow effect when glow > 0.3', () => {
    const spec = makeSpec({ style: { mood: 'dreamy', visualDensity: 0.5, contrast: 0.5, glow: 0.5 } });
    const plan = planTechnique(spec);
    expect(plan.effects).toContain('soft_glow');
  });

  it('adds bloom_like effect when glow > 0.7', () => {
    const spec = makeSpec({ style: { mood: 'dreamy', visualDensity: 0.5, contrast: 0.5, glow: 0.8 } });
    const plan = planTechnique(spec);
    expect(plan.effects).toContain('soft_glow');
    expect(plan.effects).toContain('bloom_like');
  });

  it('adds vignette for tunnel scene', () => {
    const spec = makeSpec({ scene: { type: 'tunnel', composition: 'fullscreen' } });
    const plan = planTechnique(spec);
    expect(plan.effects).toContain('vignette');
  });

  it('adds grain when contrast > 0.7', () => {
    const spec = makeSpec({ style: { mood: 'dreamy', visualDensity: 0.5, contrast: 0.8, glow: 0.1 } });
    const plan = planTechnique(spec);
    expect(plan.effects).toContain('grain');
  });

  it('sets loop budget based on performance target', () => {
    const specMobile = makeSpec({ constraints: { target: 'webgl2', performance: 'mobile_safe', maxIterations: 32, allowRaymarching: false, allowTextures: false } });
    const specDesktop = makeSpec({ constraints: { target: 'webgl2', performance: 'desktop_balanced', maxIterations: 32, allowRaymarching: false, allowTextures: false } });
    const specHigh = makeSpec({ constraints: { target: 'webgl2', performance: 'high_quality', maxIterations: 32, allowRaymarching: false, allowTextures: false } });

    expect(planTechnique(specMobile).maxLoopBudget).toBeLessThanOrEqual(planTechnique(specDesktop).maxLoopBudget);
    expect(planTechnique(specDesktop).maxLoopBudget).toBeLessThanOrEqual(planTechnique(specHigh).maxLoopBudget);
  });

  it('includes raymarching in avoid list when not allowed', () => {
    const spec = makeSpec({ constraints: { target: 'webgl2', performance: 'desktop_balanced', maxIterations: 32, allowRaymarching: false, allowTextures: false } });
    const plan = planTechnique(spec);
    expect(plan.avoid).toContain('raymarching');
  });

  it('does not include raymarching in avoid list when allowed', () => {
    const spec = makeSpec({ constraints: { target: 'webgl2', performance: 'desktop_balanced', maxIterations: 32, allowRaymarching: true, allowTextures: false } });
    const plan = planTechnique(spec);
    expect(plan.avoid).not.toContain('raymarching');
  });

  it('generates prompt hints for subject', () => {
    const spec = makeSpec({ scene: { type: 'abstract', composition: 'fullscreen', subject: 'glowing orb' } });
    const plan = planTechnique(spec);
    expect(plan.promptHints.some(h => h.includes('glowing orb'))).toBe(true);
  });

  it('generates prompt hints for low visual density', () => {
    const spec = makeSpec({ style: { mood: 'dreamy', visualDensity: 0.2, contrast: 0.5, glow: 0.5 } });
    const plan = planTechnique(spec);
    expect(plan.promptHints.some(h => h.includes('minimal'))).toBe(true);
  });
});
