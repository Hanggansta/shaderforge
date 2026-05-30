import { describe, it, expect } from 'vitest';
import { parseQualityDiagnosis, getDefaultDiagnosis } from '../telemetry/parse-quality-diagnosis';

describe('parseQualityDiagnosis', () => {
  it('parses valid JSON', () => {
    const input = JSON.stringify({
      issues: [{ category: 'brightness', severity: 'medium', description: 'Too dark' }],
      severity: 'medium',
      confidence: 0.8,
      repairHints: ['Increase brightness'],
      shouldRepair: true,
      summary: 'Shader is too dark',
    });
    const result = parseQualityDiagnosis(input);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].category).toBe('brightness');
    expect(result.severity).toBe('medium');
    expect(result.confidence).toBe(0.8);
    expect(result.shouldRepair).toBe(true);
  });

  it('parses JSON from markdown code block', () => {
    const json = JSON.stringify({
      issues: [],
      severity: 'low',
      confidence: 0.9,
      repairHints: [],
      shouldRepair: false,
      summary: 'All good',
    });
    const input = '```json\n' + json + '\n```';
    const result = parseQualityDiagnosis(input);
    expect(result.severity).toBe('low');
    expect(result.shouldRepair).toBe(false);
  });

  it('returns default diagnosis for invalid JSON', () => {
    const result = parseQualityDiagnosis('not valid json');
    expect(result.severity).toBe('low');
    expect(result.shouldRepair).toBe(false);
    expect(result.summary).toContain('parsing failed');
  });

  it('returns default diagnosis for missing required fields', () => {
    const result = parseQualityDiagnosis(JSON.stringify({ issues: [] }));
    expect(result.severity).toBe('low');
    expect(result.shouldRepair).toBe(false);
  });

  it('clamps confidence to 0-1', () => {
    const input = JSON.stringify({
      issues: [],
      severity: 'low',
      confidence: 2.0,
      repairHints: [],
      shouldRepair: false,
      summary: 'test',
    });
    const result = parseQualityDiagnosis(input);
    expect(result.confidence).toBe(1);
  });

  it('normalizes invalid severity to low', () => {
    const input = JSON.stringify({
      issues: [],
      severity: 'invalid',
      confidence: 0.5,
      repairHints: [],
      shouldRepair: false,
      summary: 'test',
    });
    const result = parseQualityDiagnosis(input);
    expect(result.severity).toBe('low');
  });
});

describe('getDefaultDiagnosis', () => {
  it('returns safe default', () => {
    const result = getDefaultDiagnosis();
    expect(result.issues).toEqual([]);
    expect(result.severity).toBe('low');
    expect(result.confidence).toBe(0);
    expect(result.shouldRepair).toBe(false);
    expect(result.summary).toContain('parsing failed');
  });
});
