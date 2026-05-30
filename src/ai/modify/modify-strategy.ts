/**
 * Modify Strategy
 * Derives strategy from ModifyIntent (AI-parsed) with deterministic safety checks.
 */

import type { ModifyIntent, ModifyOperation } from './modify-intent';

export type ModifyStrategyType =
  | 'parameter_adjustment'
  | 'small_code_patch'
  | 'effect_addition'
  | 'full_rewrite';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ModifyStrategy {
  strategy: ModifyStrategyType;
  preserve: string[];
  changeHints: string[];
  riskLevel: RiskLevel;
}

// --- Parameter targets for adjustment ---
const PARAMETER_TARGETS = new Set([
  'motion_speed', 'color', 'brightness', 'contrast', 'density', 'glow', 'noise',
]);

// --- Effect targets ---
const EFFECT_TARGETS = new Set([
  'effect', 'interaction',
]);

/**
 * Determine the modify strategy from ModifyIntent.
 * Pure deterministic logic — no LLM calls.
 */
export function determineModifyStrategy(
  modifyIntent: ModifyIntent,
): ModifyStrategy {
  const { operations, preserveCurrentStructure, requiresFullRewrite, summary, preserve } = modifyIntent;

  // Full rewrite: only when clearly requested
  if (requiresFullRewrite || hasExplicitRewrite(operations)) {
    return {
      strategy: 'full_rewrite',
      preserve: [],
      changeHints: [summary || 'User wants a completely different shader'],
      riskLevel: 'high',
    };
  }

  // Effect addition: adding new effects or interactions
  if (hasEffectAddition(operations)) {
    return {
      strategy: 'effect_addition',
      preserve: ['existing visual style', 'current animation pattern', 'color palette', ...preserve],
      changeHints: [summary || 'Add new effects'],
      riskLevel: 'low',
    };
  }

  // Parameter adjustment: modifying existing parameters
  if (hasParameterAdjustment(operations)) {
    return {
      strategy: 'parameter_adjustment',
      preserve: ['shader structure', 'main technique', 'overall composition', 'animation flow', ...preserve],
      changeHints: [summary || 'Adjust parameters'],
      riskLevel: 'low',
    };
  }

  // Default to small code patch
  return {
    strategy: 'small_code_patch',
    preserve: ['shader structure', 'main technique', 'overall composition', ...preserve],
    changeHints: [summary || 'Make targeted modifications'],
    riskLevel: preserveCurrentStructure ? 'low' : 'medium',
  };
}

function hasExplicitRewrite(operations: ModifyOperation[]): boolean {
  return operations.some(op =>
    (op.target === 'scene' && op.action === 'replace') ||
    (op.target === 'style' && op.action === 'replace' && op.strength > 0.8)
  );
}

function hasEffectAddition(operations: ModifyOperation[]): boolean {
  return operations.some(op =>
    EFFECT_TARGETS.has(op.target) && (op.action === 'add' || op.action === 'replace')
  );
}

function hasParameterAdjustment(operations: ModifyOperation[]): boolean {
  return operations.some(op =>
    PARAMETER_TARGETS.has(op.target) &&
    (op.action === 'increase' || op.action === 'decrease' || op.action === 'set')
  );
}
