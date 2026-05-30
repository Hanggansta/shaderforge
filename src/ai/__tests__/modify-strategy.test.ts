import { describe, it, expect } from 'vitest';
import { determineModifyStrategy } from '../modify/modify-strategy';
import type { ModifyIntent } from '../modify/modify-intent';

function makeIntent(overrides: Partial<ModifyIntent> = {}): ModifyIntent {
  return {
    language: 'en',
    operations: [],
    preserveCurrentStructure: true,
    requiresFullRewrite: false,
    confidence: 0.8,
    summary: 'test',
    preserve: [],
    avoid: [],
    ...overrides,
  };
}

describe('determineModifyStrategy', () => {
  it('returns full_rewrite when requiresFullRewrite is true', () => {
    const intent = makeIntent({ requiresFullRewrite: true });
    const strategy = determineModifyStrategy(intent);
    expect(strategy.strategy).toBe('full_rewrite');
    expect(strategy.riskLevel).toBe('high');
  });

  it('returns full_rewrite for scene replace with high strength', () => {
    const intent = makeIntent({
      operations: [{ target: 'scene', action: 'replace', strength: 0.9 }],
    });
    const strategy = determineModifyStrategy(intent);
    expect(strategy.strategy).toBe('full_rewrite');
  });

  it('returns effect_addition for adding effects', () => {
    const intent = makeIntent({
      operations: [{ target: 'effect', action: 'add', strength: 0.5 }],
    });
    const strategy = determineModifyStrategy(intent);
    expect(strategy.strategy).toBe('effect_addition');
    expect(strategy.riskLevel).toBe('low');
  });

  it('returns parameter_adjustment for adjusting parameters', () => {
    const intent = makeIntent({
      operations: [{ target: 'brightness', action: 'decrease', strength: 0.3 }],
    });
    const strategy = determineModifyStrategy(intent);
    expect(strategy.strategy).toBe('parameter_adjustment');
    expect(strategy.riskLevel).toBe('low');
  });

  it('returns parameter_adjustment for motion_speed increase', () => {
    const intent = makeIntent({
      operations: [{ target: 'motion_speed', action: 'increase', strength: 0.5 }],
    });
    const strategy = determineModifyStrategy(intent);
    expect(strategy.strategy).toBe('parameter_adjustment');
  });

  it('returns small_code_patch as default', () => {
    const intent = makeIntent({
      operations: [{ target: 'unknown', action: 'unknown', strength: 0.3 }],
    });
    const strategy = determineModifyStrategy(intent);
    expect(strategy.strategy).toBe('small_code_patch');
  });

  it('sets risk level based on preserveCurrentStructure', () => {
    const intentPreserve = makeIntent({
      operations: [{ target: 'unknown', action: 'unknown', strength: 0.3 }],
      preserveCurrentStructure: true,
    });
    const intentNoPreserve = makeIntent({
      operations: [{ target: 'unknown', action: 'unknown', strength: 0.3 }],
      preserveCurrentStructure: false,
    });

    expect(determineModifyStrategy(intentPreserve).riskLevel).toBe('low');
    expect(determineModifyStrategy(intentNoPreserve).riskLevel).toBe('medium');
  });

  it('includes preserve list from intent', () => {
    const intent = makeIntent({
      preserve: ['color palette', 'motion speed'],
      operations: [{ target: 'brightness', action: 'decrease', strength: 0.3 }],
    });
    const strategy = determineModifyStrategy(intent);
    expect(strategy.preserve).toContain('color palette');
    expect(strategy.preserve).toContain('motion speed');
  });

  it('handles multiple operations', () => {
    const intent = makeIntent({
      operations: [
        { target: 'brightness', action: 'decrease', strength: 0.3 },
        { target: 'effect', action: 'add', strength: 0.5 },
      ],
    });
    const strategy = determineModifyStrategy(intent);
    // effect_addition takes priority over parameter_adjustment
    expect(strategy.strategy).toBe('effect_addition');
  });
});
