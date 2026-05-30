/**
 * Quality Repair Plan Parser
 * Safe parsing and normalization of AI repair plan responses.
 * Provides fallback defaults for malformed responses.
 */

import type { QualityRepairPlan, RepairType } from './quality-repair-plan';
import { createNoOpRepairPlan } from './quality-repair-plan';

const VALID_REPAIR_TYPES: RepairType[] = [
  'brightness_contrast', 'color_balance', 'motion', 'flicker',
  'composition', 'style', 'no_op'
];

const VALID_RISK_LEVELS = ['low', 'medium', 'high'] as const;

/**
 * Parse a raw AI response into a QualityRepairPlan.
 * Returns a safe no_op plan if parsing fails.
 */
export function parseQualityRepairPlan(raw: string): QualityRepairPlan {
  try {
    const parsed = JSON.parse(raw);
    if (isValidRepairPlan(parsed)) {
      return normalizeRepairPlan(parsed);
    }
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (isValidRepairPlan(parsed)) {
          return normalizeRepairPlan(parsed);
        }
      } catch {
        // Fall through
      }
    }
  }

  return createNoOpRepairPlan('Failed to parse repair plan - defaulting to no repair');
}

function isValidRepairPlan(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.shouldRepair === 'boolean' &&
    typeof p.repairType === 'string' &&
    typeof p.riskLevel === 'string' &&
    Array.isArray(p.targetIssues) &&
    Array.isArray(p.repairHints) &&
    Array.isArray(p.preserve) &&
    Array.isArray(p.avoid) &&
    typeof p.summary === 'string'
  );
}

function normalizeRepairPlan(raw: Record<string, unknown>): QualityRepairPlan {
  return {
    shouldRepair: Boolean(raw.shouldRepair),
    repairType: VALID_REPAIR_TYPES.includes(raw.repairType as RepairType)
      ? (raw.repairType as RepairType)
      : 'no_op',
    riskLevel: VALID_RISK_LEVELS.includes(raw.riskLevel as 'low' | 'medium' | 'high')
      ? (raw.riskLevel as 'low' | 'medium' | 'high')
      : 'low',
    targetIssues: Array.isArray(raw.targetIssues)
      ? (raw.targetIssues as unknown[]).map(String)
      : [],
    repairHints: Array.isArray(raw.repairHints)
      ? (raw.repairHints as unknown[]).map(String)
      : [],
    preserve: Array.isArray(raw.preserve)
      ? (raw.preserve as unknown[]).map(String)
      : [],
    avoid: Array.isArray(raw.avoid)
      ? (raw.avoid as unknown[]).map(String)
      : [],
    summary: String(raw.summary || 'No repair plan'),
  };
}
