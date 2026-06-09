/**
 * AgentResult / AgentProgress — the bridge shape that AIChatPanel consumes.
 *
 * The new shader-agent harness produces ShaderResult. AIChatPanel and other
 * UI surfaces keep a single, smaller surface: AgentResult. The adapter in
 * ./agent-result-adapter.ts maps ShaderResult -> AgentResult.
 */

import type { AIIntent } from './types/ai-provider';
import type { ShaderCandidate } from './types/ai-provider';
import type { WorkflowStepId } from './workflow-progress';
import type { GenerationSummary, TelemetrySummary } from '../../store/aiStore';
import type { VisualCard } from '../schemas/visual-card';

export type AgentStatus =
  | 'idle' | 'generating' | 'cleaning' | 'validating'
  | 'compiling' | 'fixing' | 'success' | 'failed';

export interface AgentProgress {
  status: AgentStatus;
  attempt: number;
  maxAttempts: number;
  message: string;
  details?: string;
  pipelineStep?: WorkflowStepId;
  specSummary?: {
    intent: string;
    scene: string;
    mood: string;
    palette: string;
  };
}

export interface AnalyzedErrorLite {
  line: number;
  column: number;
  rawMessage: string;
  errorType: 'syntax_error' | 'undeclared_identifier' | 'type_conversion' | 'redefinition' | 'no_matching_function' | 'other';
  possibleCause: string;
  fixDirection: string;
}

export interface AgentResult {
  code: string;
  success: boolean;
  attempts: number;
  errors?: AnalyzedErrorLite[];
  validationIssues?: Array<{ type: 'error' | 'warning'; category: string; message: string; line?: number }>;
  progress: AgentProgress[];
  explanation?: string;
  detectedIntent?: AIIntent;
  clarification?: string;
  fallback?: boolean;
  fallbackId?: string;
  candidates?: ShaderCandidate[];
  selectedCandidateId?: string;
  generationSummary?: GenerationSummary;
  telemetry?: TelemetrySummary;
  runId?: string;
  visualCard?: VisualCard;
}
