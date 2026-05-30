/**
 * Core Agent Loop
 * Generate → Cleanup → Validate → Compile → Analyze → Fix → Retry
 */

import type { AIProvider, AIIntent } from './adapter';
import { cleanShaderCode, extractGLSLFromResponse } from './clean-code';
import { validateShaderCode, type ValidationIssue } from './validator';
import { analyzeShaderErrors, formatErrorsForAI, isDefinePlacementError, getDefineFixInstructions, type AnalyzedError } from './error-analyzer';
import { buildSystemPrompt, buildSpecAwareSystemPrompt, buildFixPrompt } from './conventions';
import type { ShaderSpec } from './spec/shader-spec';
import type { TechniquePlan } from './planner/technique-plan';
import type { GoldenShaderExample } from './library/golden-shader';
import type { ModifyStrategy } from './modify/modify-strategy';
import type { ModifyIntent } from './modify/modify-intent';
import { selectFallbackShader } from './fallback/select-fallback-shader';
import { compileShaderCandidate } from '../services/shader/shader-compiler';

export type AgentStatus =
  | 'idle'
  | 'generating'
  | 'cleaning'
  | 'validating'
  | 'compiling'
  | 'fixing'
  | 'success'
  | 'failed';

export interface AgentProgress {
  status: AgentStatus;
  attempt: number;
  maxAttempts: number;
  message: string;
  details?: string;
}

export interface AgentResult {
  code: string;
  success: boolean;
  attempts: number;
  errors?: AnalyzedError[];
  validationIssues?: ValidationIssue[];
  progress: AgentProgress[];
  explanation?: string;       // For explain intent: the explanation text
  detectedIntent?: AIIntent;  // For auto intent: the resolved intent
  clarification?: string;     // For low-confidence auto intent: ask user to clarify
}

export interface AgentOptions {
  maxAttempts?: number;       // Default: 3
  onProgress?: (progress: AgentProgress) => void;
  spec?: ShaderSpec;          // Optional ShaderSpec IR for spec-aware generation
  techniquePlan?: TechniquePlan; // Optional deterministic technique plan
  goldenExamples?: GoldenShaderExample[]; // Optional reference shaders
  modifyStrategy?: ModifyStrategy; // Optional modify strategy for modify intent
  modifyIntent?: ModifyIntent;   // Optional modify intent for modify intent
  intent?: AIIntent;          // Intent for routing (modify uses modifyShader)
  editorCode?: string;        // Current editor code (for modify intent)
  disableFallback?: boolean;  // If true, never use fallback shader (e.g. auto-repair)
}

/**
 * Core Agent Loop
 */
export async function agentLoop(
  provider: AIProvider,
  userPrompt: string,
  options: AgentOptions = {}
): Promise<AgentResult> {
  const {
    maxAttempts = 3,
    onProgress,
    spec,
    techniquePlan,
    goldenExamples,
    modifyStrategy,
    modifyIntent,
    intent,
    editorCode,
    disableFallback = false,
  } = options;

  const progressLog: AgentProgress[] = [];
  let currentCode = '';
  let lastErrors: AnalyzedError[] = [];

  const reportProgress = (status: AgentStatus, message: string, details?: string) => {
    const progress: AgentProgress = {
      status,
      attempt: 0,
      maxAttempts,
      message,
      details,
    };
    progressLog.push(progress);
    onProgress?.(progress);
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // ===== STEP 1: Generate/Fix =====
      if (attempt === 1) {
        reportProgress('generating', 'Generating shader...', `Attempt ${attempt}/${maxAttempts}`);
        currentCode = await generateCode(provider, userPrompt, spec, techniquePlan, goldenExamples, modifyStrategy, modifyIntent, intent, editorCode);
      } else {
        reportProgress('fixing', `Fixing errors (attempt ${attempt}/${maxAttempts})...`, formatErrorsForAI(lastErrors));
        currentCode = await fixCode(provider, currentCode, lastErrors);
      }

      // ===== STEP 2: Cleanup =====
      reportProgress('cleaning', 'Cleaning AI response...');
      const cleanupResult = cleanShaderCode(currentCode);
      currentCode = cleanupResult.code;
      if (cleanupResult.changes.length > 0) {
        reportProgress('cleaning', 'Cleaned code', cleanupResult.changes.join(', '));
      }

      // ===== STEP 3: Validate =====
      reportProgress('validating', 'Validating structure...');
      const validationResult = validateShaderCode(currentCode);

      if (!validationResult.valid) {
        const errorIssues = validationResult.issues.filter(i => i.type === 'error');
        reportProgress('validating', `Found ${errorIssues.length} issue(s)`, errorIssues.map(i => i.message).join('\n'));

        // If validation fails, try to fix with AI
        if (attempt < maxAttempts) {
          lastErrors = errorIssues.map(issue => ({
            line: 0,
            column: 0,
            rawMessage: issue.message,
            errorType: issue.category,
            possibleCause: issue.message,
            fixDirection: `Fix: ${issue.message}`,
          }));
          continue; // Next attempt
        }

        // Last attempt - return with issues
        return {
          code: currentCode,
          success: false,
          attempts: attempt,
          validationIssues: validationResult.issues,
          progress: progressLog,
        };
      }

      // ===== STEP 4: Compile (direct, no store polling) =====
      reportProgress('compiling', 'Compiling shader...');
      const compileResult = compileShaderCandidate(currentCode);

      if (compileResult.success) {
        reportProgress('success', 'Shader compiled successfully!');
        return {
          code: currentCode,
          success: true,
          attempts: attempt,
          progress: progressLog,
        };
      }

      // ===== STEP 5: Analyze Errors =====
      if (compileResult.errorLog) {
        const analysis = analyzeShaderErrors(compileResult.errorLog);
        lastErrors = analysis.errors;

        // Add specific instructions for #define placement errors
        if (isDefinePlacementError(analysis.errors)) {
          const defineInstructions = getDefineFixInstructions(analysis.errors);
          reportProgress('compiling', `Compilation failed: ${analysis.summary}`, defineInstructions);
          if (lastErrors.length > 0) {
            lastErrors[lastErrors.length - 1].fixDirection += '\n' + defineInstructions;
          }
        } else {
          reportProgress('compiling', `Compilation failed: ${analysis.summary}`);
        }
      } else {
        reportProgress('compiling', 'Compilation failed with unknown error');
        lastErrors = [];
      }

      // If last attempt, return with errors
      if (attempt >= maxAttempts) {
        // Use fallback shader if spec and plan are available (and fallback not disabled)
        if (!disableFallback && spec && techniquePlan) {
          const fallback = selectFallbackShader(spec, techniquePlan);
          reportProgress('failed', 'Using fallback shader', `Original generation failed after ${attempt} attempts`);
          return {
            code: fallback.code,
            success: false,
            attempts: attempt,
            errors: lastErrors,
            progress: progressLog,
          };
        }
        return {
          code: currentCode,
          success: false,
          attempts: attempt,
          errors: lastErrors,
          progress: progressLog,
        };
      }

      // Continue to next attempt
      continue;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reportProgress('failed', `Error: ${errorMessage}`);

      if (attempt >= maxAttempts) {
        // Use fallback shader if spec and plan are available (and fallback not disabled)
        if (!disableFallback && spec && techniquePlan) {
          const fallback = selectFallbackShader(spec, techniquePlan);
          reportProgress('failed', 'Using fallback shader', `API error after ${attempt} attempts`);
          return {
            code: fallback.code,
            success: false,
            attempts: attempt,
            errors: [{
              line: 0,
              column: 0,
              rawMessage: errorMessage,
              errorType: 'api_error',
              possibleCause: 'AI API call failed',
              fixDirection: 'Check API key and network connection',
            }],
            progress: progressLog,
          };
        }
        return {
          code: currentCode,
          success: false,
          attempts: attempt,
          errors: [{
            line: 0,
            column: 0,
            rawMessage: errorMessage,
            errorType: 'api_error',
            possibleCause: 'AI API call failed',
            fixDirection: 'Check API key and network connection',
          }],
          progress: progressLog,
        };
      }
    }
  }

  // Should not reach here, but just in case
  // Use fallback shader if spec and plan are available (and fallback not disabled)
  if (!disableFallback && spec && techniquePlan) {
    const fallback = selectFallbackShader(spec, techniquePlan);
    return {
      code: fallback.code,
      success: false,
      attempts: maxAttempts,
      errors: lastErrors,
      progress: progressLog,
    };
  }
  return {
    code: currentCode,
    success: false,
    attempts: maxAttempts,
    errors: lastErrors,
    progress: progressLog,
  };
}

/**
 * Generate initial code from AI
 */
async function generateCode(
  provider: AIProvider,
  userPrompt: string,
  spec?: ShaderSpec,
  techniquePlan?: TechniquePlan,
  goldenExamples?: GoldenShaderExample[],
  modifyStrategy?: ModifyStrategy,
  modifyIntent?: ModifyIntent,
  intent?: AIIntent,
  editorCode?: string,
): Promise<string> {
  const systemPrompt = spec ? buildSpecAwareSystemPrompt(spec, techniquePlan, goldenExamples, modifyStrategy, modifyIntent) : buildSystemPrompt();
  const fullPrompt = `${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}`;

  let response;
  if (intent === 'modify' && editorCode) {
    response = await provider.modifyShader(fullPrompt, editorCode);
  } else {
    response = await provider.generateShader(fullPrompt);
  }

  const code = response.code || '';
  const extracted = extractGLSLFromResponse(code);
  return extracted || code;
}

/**
 * Fix code with errors
 */
async function fixCode(
  provider: AIProvider,
  code: string,
  errors: AnalyzedError[]
): Promise<string> {
  const fixPrompt = buildFixPrompt(code, errors);
  const systemPrompt = buildSystemPrompt();
  const fullPrompt = `${systemPrompt}\n\n${fixPrompt}`;

  const response = await provider.fixShader(code, fullPrompt);
  const fixedCode = response.code || '';

  const extracted = extractGLSLFromResponse(fixedCode);
  return extracted || fixedCode;
}
