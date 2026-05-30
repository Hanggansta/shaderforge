/**
 * Quality Diagnosis using AI
 * Uses text-only provider to diagnose render quality from telemetry JSON.
 * No vision model required.
 */

import type { AIProvider } from '../adapter';
import type { RenderTelemetry, QualityDiagnosis, DiagnosisResult } from './types';
import { deriveQualitySignals, type QualitySignal } from './quality-signals';

const DIAGNOSIS_SYSTEM_PROMPT = `You are a shader quality analyst. Given render telemetry data and derived quality signals, diagnose visual quality issues and suggest fixes.

You will receive:
1. The original user prompt
2. The ShaderSpec (structured intent)
3. The TechniquePlan (implementation strategy)
4. Render metrics captured from the actual rendered output
5. Derived quality signals with measured evidence

IMPORTANT: Quality signals are MEASURED EVIDENCE from the actual rendered output. Treat them as ground truth. Your job is to:
- Interpret signals in context of the spec/plan
- Identify which signals indicate real problems vs expected behavior
- Suggest specific code-level fixes

For example:
- A "too_dark" signal with a "dreamy" mood might be intentional
- A "no_visible_motion" signal with motion type "static" is expected
- A "low_contrast" signal with high visual density is a real issue

Respond with ONLY valid JSON matching this schema:
{
  "issues": [
    {
      "category": "string describing the issue type",
      "severity": "low" | "medium" | "high",
      "description": "human-readable explanation"
    }
  ],
  "severity": "low" | "medium" | "high",
  "confidence": 0.0-1.0,
  "repairHints": ["specific code-level suggestions to fix issues"],
  "shouldRepair": true/false,
  "summary": "one-line overall assessment"
}

Be conservative - only flag issues you're confident about based on the signals and metrics.`;

/**
 * Diagnose render quality using AI provider.
 * Uses chatCompletion (text-only) - no vision model needed.
 */
export async function diagnoseQuality(
  provider: AIProvider,
  telemetry: RenderTelemetry
): Promise<DiagnosisResult> {
  try {
    // Derive deterministic quality signals from metrics
    const signals = deriveQualitySignals(telemetry.metrics);

    const prompt = buildDiagnosisPrompt(telemetry, signals);
    const response = await provider.chatCompletion([
      { role: 'system', content: DIAGNOSIS_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    const diagnosis = parseDiagnosisResponse(response);
    if (!diagnosis) {
      return { success: false, error: 'Failed to parse diagnosis response' };
    }

    return { success: true, diagnosis };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown diagnosis error',
    };
  }
}

function buildDiagnosisPrompt(telemetry: RenderTelemetry, signals: QualitySignal[]): string {
  const signalList = signals.map(s =>
    `- [${s.severity.toUpperCase()}] ${s.type}: ${s.evidence} (confidence: ${s.confidence.toFixed(2)})`
  ).join('\n');

  return `Analyze this shader render quality:

## Original Prompt
${telemetry.prompt}

## ShaderSpec
${JSON.stringify(telemetry.spec, null, 2)}

## TechniquePlan
${JSON.stringify(telemetry.plan, null, 2)}

## Render Metrics
- Brightness: ${telemetry.metrics.brightness.toFixed(3)} (0=black, 1=white)
- Contrast: ${telemetry.metrics.contrast.toFixed(3)} (0=flat, 1=high contrast)
- Saturation: ${telemetry.metrics.saturation.toFixed(3)} (0=grayscale, 1=vivid)
- Color Variance: ${telemetry.metrics.colorVariance.toFixed(3)} (0=uniform, 1=diverse)
- Frame Delta (motion): ${telemetry.metrics.frameDelta.toFixed(3)} (0=static, 1=fast motion)
- Flicker Score: ${telemetry.metrics.flickerScore.toFixed(3)} (0=stable, 0.3+=flickering)
- Center/Edge Ratio: ${telemetry.metrics.centerEdgeRatio.toFixed(3)} (1=balanced, <0.5=edge-heavy, >1.5=center-heavy)

## Quality Signals (MEASURED EVIDENCE)
${signalList}

Diagnose quality issues based on the signals and metrics above. Consider the spec/plan context when interpreting signals. Output ONLY JSON.`;
}

function parseDiagnosisResponse(response: string): QualityDiagnosis | null {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(response);
    if (isValidDiagnosis(parsed)) {
      return normalizeDiagnosis(parsed);
    }
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (isValidDiagnosis(parsed)) {
          return normalizeDiagnosis(parsed);
        }
      } catch {
        // Fall through
      }
    }
  }
  return null;
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
  const issues = (raw.issues as Array<Record<string, unknown>>).map((issue) => ({
    category: String(issue.category || 'unknown'),
    severity: ['low', 'medium', 'high'].includes(String(issue.severity))
      ? (issue.severity as 'low' | 'medium' | 'high')
      : 'low',
    description: String(issue.description || ''),
  }));

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
    repairHints: (raw.repairHints as string[]).map(String),
    shouldRepair: Boolean(raw.shouldRepair),
    summary: String(raw.summary || 'No issues detected'),
  };
}
