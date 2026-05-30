/**
 * Render Telemetry Types
 * Captures limited render metrics for AI quality diagnosis.
 * No vision model required - uses pixel analysis only.
 */

export interface RenderTelemetry {
  /** Original user prompt */
  prompt: string;
  /** ShaderSpec that was used */
  spec: {
    scene: { type: string };
    style: { mood: string; visualDensity: number; contrast: number; glow: number };
    motion: { type: string; speed: number; smoothness: number };
    color: { palette: string };
  };
  /** TechniquePlan that was used */
  plan: {
    baseTechnique: string;
    motion: string;
    colorMethod: string;
    effects: string[];
    maxLoopBudget: number;
  };
  /** Render metrics captured from canvas */
  metrics: RenderMetrics;
  /** Timestamp of capture */
  capturedAt: number;
  /** Request ID for deduplication */
  requestId: string;
}

export interface RenderMetrics {
  /** Average brightness across all pixels (0-1) */
  brightness: number;
  /** Standard deviation of brightness (0-1) */
  contrast: number;
  /** Average saturation in HSL space (0-1) */
  saturation: number;
  /** Color variance across frame (0-1) */
  colorVariance: number;
  /** Average pixel difference between consecutive frames (0-1) */
  frameDelta: number;
  /** Temporal brightness variance - high = flickering (0-1) */
  flickerScore: number;
  /** Energy in center 50% of frame vs edges (0-1) */
  centerEdgeRatio: number;
}

export interface QualityIssue {
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface QualityDiagnosis {
  issues: QualityIssue[];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  repairHints: string[];
  shouldRepair: boolean;
  summary: string;
}

export interface DiagnosisResult {
  success: boolean;
  diagnosis?: QualityDiagnosis;
  error?: string;
}

export interface AutoRepairResult {
  attempted: boolean;
  success: boolean;
  code?: string;
  error?: string;
}

export interface TelemetryResult {
  success: boolean;
  diagnosis?: QualityDiagnosis;
  repairPlan?: QualityRepairPlan;
  autoRepair?: AutoRepairResult;
  metrics?: RenderMetrics;
  error?: string;
}

import type { QualityRepairPlan } from './quality-repair-plan';
