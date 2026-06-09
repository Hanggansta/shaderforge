import { describe, it, expect } from 'vitest';
import { resolveIntent, intentRequiresCode, intentCountsTowardQuota } from '../integration/intent-router';

describe('resolveIntent', () => {
  it('returns explicit intent unchanged', () => {
    expect(resolveIntent({
      requested: 'modify',
      hasCompileErrors: false,
      hasSubstantialCode: true,
      prompt: 'make it blue',
    })).toBe('modify');
  });

  it('auto resolves to fix when compile errors exist', () => {
    expect(resolveIntent({
      requested: 'auto',
      hasCompileErrors: true,
      hasSubstantialCode: true,
      prompt: 'anything',
    })).toBe('fix');
  });

  it('auto resolves to explain from prompt hints', () => {
    expect(resolveIntent({
      requested: 'auto',
      hasCompileErrors: false,
      hasSubstantialCode: true,
      prompt: 'explain what this shader does',
    })).toBe('explain');
  });

  it('auto resolves to create for fresh prompts', () => {
    expect(resolveIntent({
      requested: 'auto',
      hasCompileErrors: false,
      hasSubstantialCode: false,
      prompt: 'a violet nebula in deep space',
    })).toBe('create');
  });
});

describe('intent helpers', () => {
  it('intentRequiresCode flags editor-dependent intents', () => {
    expect(intentRequiresCode('explain')).toBe(true);
    expect(intentRequiresCode('create')).toBe(false);
  });

  it('explain does not count toward quota', () => {
    expect(intentCountsTowardQuota('explain')).toBe(false);
    expect(intentCountsTowardQuota('create')).toBe(true);
  });
});