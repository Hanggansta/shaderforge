import { describe, it, expect } from 'vitest';
import { parseQualityRepairPlan } from '../telemetry/parse-quality-repair-plan';

describe('parseQualityRepairPlan', () => {
  it('parses valid JSON', () => {
    const input = JSON.stringify({
      shouldRepair: true,
      repairType: 'brightness_contrast',
      riskLevel: 'low',
      targetIssues: ['too dark'],
      repairHints: ['Increase brightness'],
      preserve: ['color palette'],
      avoid: ['scene change'],
      summary: 'Fix brightness',
    });
    const result = parseQualityRepairPlan(input);
    expect(result.shouldRepair).toBe(true);
    expect(result.repairType).toBe('brightness_contrast');
    expect(result.riskLevel).toBe('low');
    expect(result.targetIssues).toEqual(['too dark']);
  });

  it('parses JSON from markdown code block', () => {
    const json = JSON.stringify({
      shouldRepair: false,
      repairType: 'no_op',
      riskLevel: 'low',
      targetIssues: [],
      repairHints: [],
      preserve: [],
      avoid: [],
      summary: 'No repair needed',
    });
    const input = '```json\n' + json + '\n```';
    const result = parseQualityRepairPlan(input);
    expect(result.shouldRepair).toBe(false);
    expect(result.repairType).toBe('no_op');
  });

  it('returns no_op plan for invalid JSON', () => {
    const result = parseQualityRepairPlan('not valid json');
    expect(result.shouldRepair).toBe(false);
    expect(result.repairType).toBe('no_op');
    expect(result.riskLevel).toBe('low');
  });

  it('returns no_op plan for missing required fields', () => {
    const result = parseQualityRepairPlan(JSON.stringify({ shouldRepair: true }));
    expect(result.repairType).toBe('no_op');
  });

  it('normalizes invalid repairType to no_op', () => {
    const input = JSON.stringify({
      shouldRepair: true,
      repairType: 'invalid_type',
      riskLevel: 'low',
      targetIssues: [],
      repairHints: [],
      preserve: [],
      avoid: [],
      summary: 'test',
    });
    const result = parseQualityRepairPlan(input);
    expect(result.repairType).toBe('no_op');
  });

  it('normalizes invalid riskLevel to low', () => {
    const input = JSON.stringify({
      shouldRepair: true,
      repairType: 'brightness_contrast',
      riskLevel: 'invalid',
      targetIssues: [],
      repairHints: [],
      preserve: [],
      avoid: [],
      summary: 'test',
    });
    const result = parseQualityRepairPlan(input);
    expect(result.riskLevel).toBe('low');
  });
});
