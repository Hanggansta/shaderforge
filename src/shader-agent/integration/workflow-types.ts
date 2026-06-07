/**
 * Workflow Inspector types — the contract between the V1 shader-agent
 * harness and the UI Inspector.
 *
 * In V1 the harness only emits:
 *   - `RunArtifact` (from `runsStore`) with the **final** state of each
 *     stage (visualCard, shaderPlan, references, compileAttempts[])
 *   - `AgentProgress` fired **twice** (start + end) by the service
 *
 * So in V1 the Inspector reads `RunArtifact` and adapts it into a
 * `WorkflowRun` via `runArtifactToWorkflowRun()`. Per-step fields
 * (systemPrompt / userPromptSent / rawLlmResponse / durationMs / usage)
 * are mostly `undefined` in V1 — the Inspector shows them as
 * "Data not captured in V1 harness".
 *
 * V2 will extend `RunArtifact` with `steps?: WorkflowStep[]` and have
 * the workflows populate it. Same types, no breaking change.
 */

import type {
  VisualCard,
} from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';
import type { ReferenceCard } from '../schemas/reference-card';
import type { CompileReport } from '../schemas/compile-report';
import type { ScreenshotFrame } from '../schemas/shader-result';

export type WorkflowStepKind =
  | 'visual_structurer'
  | 'shader_planner'
  | 'reference_selector'
  | 'code_agent_generate'
  | 'code_agent_fix_compile'
  | 'code_agent_fix_feedback'
  | 'shader_compiler'
  | 'screenshot_renderer';

export type WorkflowStepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'warning'
  | 'error'
  | 'skipped'
  | 'cancelled';

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface WorkflowStepError {
  message: string;
  code?: string;
  stack?: string;
}

export interface WorkflowStep {
  kind: WorkflowStepKind;
  index: number;
  title: string;
  status: WorkflowStepStatus;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  systemPrompt?: string;
  userPromptSent?: string;
  rawLlmResponse?: string;
  input?: unknown;
  output?: unknown;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
  warnings?: string[];
  error?: WorkflowStepError;
  notes?: string;
}

export type WorkflowRunStatus = 'idle' | 'running' | 'success' | 'failed' | 'cancelled';

export interface WorkflowRun {
  id: string;
  createdAt: number;
  finishedAt?: number;
  totalDurationMs?: number;
  userPrompt: string;
  workflow: 'generate' | 'patch';
  status: WorkflowRunStatus;
  currentStage?: WorkflowStepKind;
  steps: WorkflowStep[];
  finalCode?: string;
  visualCard?: VisualCard;
  shaderPlan?: ShaderPlan;
  references?: ReferenceCard[];
  compileAttempts?: CompileReport[];
  visualScore?: number;
  visualBreakdown?: Record<string, { score: number; reason: string }>;
  screenshots?: ScreenshotFrame[];
}

export const STEP_TITLE: Record<WorkflowStepKind, string> = {
  visual_structurer: 'Visual Structurer',
  shader_planner: 'Shader Planner',
  reference_selector: 'Reference Selector',
  code_agent_generate: 'Code Agent (Generate)',
  code_agent_fix_compile: 'Code Agent (Fix Compile)',
  code_agent_fix_feedback: 'Code Agent (Fix Feedback)',
  shader_compiler: 'Compile',
  screenshot_renderer: 'Screenshot Renderer',
};
