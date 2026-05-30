/**
 * Quality Diagnosis Parser
 * Safe parsing and normalization of AI diagnosis responses.
 * Provides fallback defaults for malformed responses.
 */

import type { QualityDiagnosis } from './types';

/**
 * Parse a raw AI response into a QualityDiagnosis.
 * Returns a safe default if parsing fails.
 */
export function parseQualityDiagnosis(raw: string): QualityDiagnosis {
  try {
    const parsed = JSON.parse(raw);
    if (isValidDiagnosis(parsed)) {
      return normalizeDiagnosis(parsed);
    }
  } catch {
    // Fall through to default
  }

  // Try to extract JSON from markdown code blocks
  const jsonMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (isValidDiagnosis(parsed)) {
        return normalizeDiagnosis(parsed);
      }
    } catch {
      // Fall through to default
    }
  }

  return getDefaultDiagnosis();
}

function isValidDiagnosis(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return false;
  const d = obj as Record<string, unknown>;
  return (
    Array.isArray(d.issues) &&
    typeof d.severity === 'string' &&
    typeof d.confidence === 'number' &&
    Array.isArray(d.repairHints) &&
    typeof d.shouldRepair === 'boolean' &&
    typeof d.summary === 'string'
  );
}

function normalizeDiagnosis(raw: Record<string, unknown>): QualityDiagnosis {
  const issues = Array.isArray(raw.issues)
    ? (raw.issues as Array<Record<string, unknown>>).map((issue) => ({
        category: String(issue.category || 'unknown'),
        severity: ['low', 'medium', 'high'].includes(String(issue.severity))
          ? (issue.severity as 'low' | 'medium' | 'high')
          : 'low',
        description: String(issue.description || ''),
      }))
    : [];

  const severity = ['low', 'medium', 'high'].includes(String(raw.severity))
    ? (raw.severity as 'low' | 'medium' | 'high')
    : issues.some((i) => i.severity === 'high')
      ? 'high'
      : issues.some((i) => i.severity === 'medium')
        ? 'medium'
        : 'low';

  return {
    issues,
    severity,
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
    repairHints: Array.isArray(raw.repairHints)
      ? (raw.repairHints as unknown[]).map(String)
      : [],
    shouldRepair: Boolean(raw.shouldRepair),
    summary: String(raw.summary || 'No issues detected'),
  };
}

/**
 * Default diagnosis when parsing fails.
 */
export function getDefaultDiagnosis(): QualityDiagnosis {
  return {
    issues: [],
    severity: 'low',
    confidence: 0,
    repairHints: [],
    shouldRepair: false,
    summary: 'Unable to diagnose - parsing failed',
  };
}
