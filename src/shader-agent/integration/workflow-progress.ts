/**
 * Pipeline step identifiers — emitted by workflows for UI progress tracking.
 */

export type WorkflowStepId =
  | 'visual_structurer'
  | 'shader_planner'
  | 'reference_selector'
  | 'code_agent'
  | 'candidate_rerank'
  | 'compiling'
  | 'fixing'
  | 'screenshot'
  | 'visual_polish';

export const WORKFLOW_STEP_LABELS: Record<WorkflowStepId, string> = {
  visual_structurer: 'Visual structurer',
  shader_planner: 'Shader planner',
  reference_selector: 'Reference selector',
  code_agent: 'Code agent',
  candidate_rerank: 'Candidate rerank',
  compiling: 'Compiling',
  fixing: 'Fixing errors',
  screenshot: 'Screenshot render',
  visual_polish: 'Visual polish',
};

export interface WorkflowStepEvent {
  step: WorkflowStepId;
  message: string;
  details?: string;
}

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted', 'AbortError');
  }
}