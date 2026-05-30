import { describe, it, expect } from 'vitest';
import { normalizeShaderSpec, createDefaultSpec } from '../spec/normalize-shader-spec';

describe('normalizeShaderSpec', () => {
  it('returns valid spec for empty input', () => {
    const result = normalizeShaderSpec({});
    expect(result.intent).toBe('create');
    expect(result.scene.type).toBe('unknown');
    expect(result.scene.composition).toBe('fullscreen');
    expect(result.style.mood).toBe('dreamy');
    expect(result.style.visualDensity).toBe(0.5);
    expect(result.constraints.target).toBe('webgl2');
    expect(result.constraints.allowTextures).toBe(false);
  });

  it('returns valid spec for null input', () => {
    const result = normalizeShaderSpec(null);
    expect(result.intent).toBe('create');
    expect(result.scene.type).toBe('unknown');
  });

  it('clamps numeric values to 0-1', () => {
    const result = normalizeShaderSpec({
      style: { visualDensity: 2.0, contrast: -0.5, glow: 0.8 },
    });
    expect(result.style.visualDensity).toBe(1);
    expect(result.style.contrast).toBe(0);
    expect(result.style.glow).toBe(0.8);
  });

  it('handles NaN numeric values', () => {
    const result = normalizeShaderSpec({
      style: { visualDensity: NaN, contrast: NaN, glow: NaN },
    });
    expect(result.style.visualDensity).toBe(0.5);
    expect(result.style.contrast).toBe(0.5);
    expect(result.style.glow).toBe(0.5);
  });

  it('picks valid enum values', () => {
    const result = normalizeShaderSpec({
      scene: { type: 'invalid_scene', composition: 'invalid_comp' },
      style: { mood: 'invalid_mood' },
      motion: { type: 'invalid_motion' },
      color: { palette: 'invalid_palette' },
    });
    expect(result.scene.type).toBe('unknown');
    expect(result.scene.composition).toBe('fullscreen');
    expect(result.style.mood).toBe('dreamy');
    expect(result.motion.type).toBe('flow');
    expect(result.color.palette).toBe('purple_blue');
  });

  it('preserves valid enum values', () => {
    const result = normalizeShaderSpec({
      intent: 'modify',
      scene: { type: 'nebula', composition: 'center_focus' },
      style: { mood: 'cyberpunk' },
      motion: { type: 'swirl' },
      color: { palette: 'neon_cyber' },
    });
    expect(result.intent).toBe('modify');
    expect(result.scene.type).toBe('nebula');
    expect(result.scene.composition).toBe('center_focus');
    expect(result.style.mood).toBe('cyberpunk');
    expect(result.motion.type).toBe('swirl');
    expect(result.color.palette).toBe('neon_cyber');
  });

  it('clamps maxIterations to 16-64', () => {
    const result1 = normalizeShaderSpec({ constraints: { maxIterations: 5 } });
    expect(result1.constraints.maxIterations).toBe(16);

    const result2 = normalizeShaderSpec({ constraints: { maxIterations: 100 } });
    expect(result2.constraints.maxIterations).toBe(64);

    const result3 = normalizeShaderSpec({ constraints: { maxIterations: 32 } });
    expect(result3.constraints.maxIterations).toBe(32);
  });

  it('enforces allowTextures: false', () => {
    const result = normalizeShaderSpec({ constraints: { allowTextures: true as unknown as false } });
    expect(result.constraints.allowTextures).toBe(false);
  });

  it('enforces target: webgl2', () => {
    const result = normalizeShaderSpec({ constraints: { target: 'webgl1' as unknown as 'webgl2' } });
    expect(result.constraints.target).toBe('webgl2');
  });

  it('handles modification field', () => {
    const result = normalizeShaderSpec({
      modification: {
        currentProblem: 'too dark',
        requestedChange: 'make brighter',
        preserve: ['color palette', 'motion'],
      },
    });
    expect(result.modification?.currentProblem).toBe('too dark');
    expect(result.modification?.requestedChange).toBe('make brighter');
    expect(result.modification?.preserve).toEqual(['color palette', 'motion']);
  });

  it('filters non-string colors', () => {
    const result = normalizeShaderSpec({
      color: { colors: ['#ff0000', 123, '#00ff00'] as unknown as string[] },
    });
    expect(result.color.colors).toEqual(['#ff0000', '#00ff00']);
  });
});

describe('createDefaultSpec', () => {
  it('creates default spec with create intent', () => {
    const spec = createDefaultSpec();
    expect(spec.intent).toBe('create');
    expect(spec.scene.type).toBe('unknown');
    expect(spec.constraints.target).toBe('webgl2');
    expect(spec.constraints.allowTextures).toBe(false);
  });

  it('creates default spec with custom intent', () => {
    const spec = createDefaultSpec('modify');
    expect(spec.intent).toBe('modify');
  });
});
