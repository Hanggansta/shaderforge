/**
 * Quality Repair Plan Generation
 * Creates structured repair plans from quality diagnosis.
 * Does NOT modify shader code - only plans repairs.
 */

import type { AIProvider } from '../adapter';
import type { RenderTelemetry, QualityDiagnosis } from './types';
import type { QualitySignal } from './quality-signals';

export type RepairType =
  | 'brightness_contrast'
  | 'color_balance'
  | 'motion'
  | 'flicker'
  | 'composition'
  | 'style'
  | 'no_op';

export interface QualityRepairPlan {
  shouldRepair: boolean;
  repairType: RepairType;
  riskLevel: 'low' | 'medium' | 'high';
  targetIssues: string[];
  repairHints: string[];
  preserve: string[];
  avoid: string[];
  summary: string;
}

export interface RepairPlanResult {
  success: boolean;
  plan?: QualityRepairPlan;
  error?: string;
}

const REPAIR_PLAN_SYSTEM_PROMPT = `You are a shader repair planner. Given quality signals and diagnosis from a rendered shader, create a structured repair plan.

IMPORTANT RULES:
1. Quality signals are MEASURED EVIDENCE - treat them as ground truth
2. Respect user intent - monochrome/minimal/static may be VALID if requested
3. Only recommend repair if there's a clear mismatch between intent and result
4. Never suggest repairs that would break the shader's intended style
5. Output ONLY valid JSON

Repair types:
- brightness_contrast: adjust overall brightness/contrast
- color_balance: adjust color saturation/vibrancy
- motion: add or adjust animation
- flicker: reduce temporal instability
- composition: adjust spatial balance
- style: adjust visual style/mood
- no_op: no repair needed (signals are expected for this shader type)

Risk levels:
- low: safe parameter adjustments (brightness, contrast, saturation)
- medium: structural changes (add motion, adjust composition)
- high: fundamental changes (change technique, rewrite sections)`;

export async function createQualityRepairPlan(
  provider: AIProvider,
  telemetry: RenderTelemetry,
  signals: QualitySignal[],
  diagnosis: QualityDiagnosis
): Promise<RepairPlanResult> {
  try {
    const prompt = buildRepairPlanPrompt(telemetry, signals, diagnosis);
    const response = await provider.chatCompletion([
      { role: 'system', content: REPAIR_PLAN_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    const plan = parseRepairPlanResponse(response);
    if (!plan) {
      return { success: false, error: 'Failed to parse repair plan response' };
    }

    return { success: true, plan };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown repair plan error',
    };
  }
}

function buildRepairPlanPrompt(
  telemetry: RenderTelemetry,
  signals: QualitySignal[],
  diagnosis: QualityDiagnosis
): string {
  const signalList = signals.map(s =>
    `- [${s.severity.toUpperCase()}] ${s.type}: ${s.evidence}`
  ).join('\n');

  const issueList = diagnosis.issues.map(i =>
    `- [${i.severity.toUpperCase()}] ${i.category}: ${i.description}`
  ).join('\n');

  return `Create a repair plan for this shader:

## Original User Intent
"${telemetry.prompt}"

## ShaderSpec (what user wanted)
- Scene: ${telemetry.spec.scene.type}
- Style: mood=${telemetry.spec.style.mood}, density=${telemetry.spec.style.visualDensity}, contrast=${telemetry.spec.style.contrast}
- Motion: type=${telemetry.spec.motion.type}, speed=${telemetry.spec.motion.speed}
- Color: palette=${telemetry.spec.color.palette}

## Measured Quality Signals
${signalList}

## Quality Diagnosis
Summary: ${diagnosis.summary}
Confidence: ${diagnosis.confidence}
Issues:
${issueList}

## Render Metrics
- Brightness: ${telemetry.metrics.brightness.toFixed(3)}
- Contrast: ${telemetry.metrics.contrast.toFixed(3)}
- Saturation: ${telemetry.metrics.saturation.toFixed(3)}
- Motion: ${telemetry.metrics.frameDelta.toFixed(3)}
- Flicker: ${telemetry.metrics.flickerScore.toFixed(3)}

Consider: Is the shader intentionally minimal/monochrome/static? Does the user's request match the result?
Output ONLY JSON with the repair plan.`;
}

function parseRepairPlanResponse(response: string): QualityRepairPlan | null {
  try {
    const parsed = JSON.parse(response);
    if (isValidRepairPlan(parsed)) {
      return normalizeRepairPlan(parsed);
    }
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*\n([\s\S]*?)```/);
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
  return null;
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
  const validRepairTypes: RepairType[] = [
    'brightness_contrast', 'color_balance', 'motion', 'flicker',
    'composition', 'style', 'no_op'
  ];
  const validRiskLevels = ['low', 'medium', 'high'];

  return {
    shouldRepair: Boolean(raw.shouldRepair),
    repairType: validRepairTypes.includes(raw.repairType as RepairType)
      ? (raw.repairType as RepairType)
      : 'no_op',
    riskLevel: validRiskLevels.includes(raw.riskLevel as string)
      ? (raw.riskLevel as 'low' | 'medium' | 'high')
      : 'low',
    targetIssues: (raw.targetIssues as unknown[]).map(String),
    repairHints: (raw.repairHints as unknown[]).map(String),
    preserve: (raw.preserve as unknown[]).map(String),
    avoid: (raw.avoid as unknown[]).map(String),
    summary: String(raw.summary || 'No repair needed'),
  };
}

/**
 * Create a safe no-op repair plan for fallback cases.
 */
export function createNoOpRepairPlan(summary: string): QualityRepairPlan {
  return {
    shouldRepair: false,
    repairType: 'no_op',
    riskLevel: 'low',
    targetIssues: [],
    repairHints: [],
    preserve: [],
    avoid: [],
    summary,
  };
}
