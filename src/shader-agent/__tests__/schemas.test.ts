/**
 * Schema tests for the Shader Agent Harness.
 */

import { describe, it, expect } from 'vitest';
import { tryParseJson } from '../integration/llm-adapters';
import { createDefaultSpec, normalizeShaderSpec } from '../schemas/normalize-shader-spec';

describe('Schemas', () => {
  describe('ShaderSpec defaults and normalization', () => {
    it('createDefaultSpec returns a valid baseline', () => {
      const spec = createDefaultSpec();
      expect(spec.intent).toBe('create');
      expect(spec.scene.type).toBe('unknown');
      expect(spec.constraints.performance).toBe('desktop_balanced');
    });

    it('normalizeShaderSpec fills missing fields with defaults', () => {
      const spec = normalizeShaderSpec({});
      expect(spec.intent).toBe('create');
      expect(spec.style.mood).toBeDefined();
      expect(spec.constraints.maxIterations).toBeGreaterThan(0);
    });

    it('normalizeShaderSpec preserves valid fields', () => {
      const spec = normalizeShaderSpec({
        scene: { type: 'nebula', composition: 'fullscreen' },
        style: { mood: 'dreamy' },
      });
      expect(spec.scene.type).toBe('nebula');
      expect(spec.style.mood).toBe('dreamy');
    });

    it('normalizeShaderSpec coerces unknown enum values to safe defaults', () => {
      const spec = normalizeShaderSpec({
        scene: { type: 'totally-fake' as never },
        style: { mood: 'not-a-mood' as never },
      });
      expect(spec.scene.type).toBeDefined();
      expect(spec.style.mood).toBeDefined();
    });
  });
});

describe('LLM adapter JSON parsing', () => {
  it('parses raw JSON', () => {
    const v = tryParseJson<{ a: number }>('{"a": 1}');
    expect(v).toEqual({ a: 1 });
  });

  it('parses JSON inside markdown fences', () => {
    const v = tryParseJson<{ a: number }>('```json\n{"a": 1}\n```');
    expect(v).toEqual({ a: 1 });
  });

  it('parses JSON with surrounding prose', () => {
    const v = tryParseJson<{ a: number }>('Here is the JSON: {"a": 1}. Done.');
    expect(v).toEqual({ a: 1 });
  });

  it('returns null for empty string', () => {
    expect(tryParseJson('')).toBeNull();
  });

  it('returns null for non-JSON text', () => {
    expect(tryParseJson('just some prose, no JSON here')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(tryParseJson('{ "a": ')).toBeNull();
  });
});
