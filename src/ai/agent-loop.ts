/**
 * Core Agent Loop
 * Generate → Cleanup → Validate → Compile → Analyze → Fix → Retry
 */

import type { AIProvider } from './adapter';
import { cleanShaderCode, extractGLSLFromResponse } from './clean-code';
import { validateShaderCode, type ValidationIssue } from './validator';
import { analyzeShaderErrors, formatErrorsForAI, isDefinePlacementError, getDefineFixInstructions, type AnalyzedError } from './error-analyzer';
import { buildSystemPrompt, buildFixPrompt } from './conventions';

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

export interface CompileResult {
  success: boolean;
  errorLog?: string;
  errors?: AnalyzedError[];
}

export interface AgentResult {
  code: string;
  success: boolean;
  attempts: number;
  errors?: AnalyzedError[];
  validationIssues?: ValidationIssue[];
  progress: AgentProgress[];
}

export interface AgentOptions {
  maxAttempts?: number;       // Default: 3
  compileFn?: (code: string) => Promise<CompileResult>;  // Compile function
  onProgress?: (progress: AgentProgress) => void;
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
    compileFn,
    onProgress,
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
        currentCode = await generateCode(provider, userPrompt);
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

      // ===== STEP 4: Compile =====
      if (compileFn) {
        reportProgress('compiling', 'Compiling shader...');
        const compileResult = await compileFn(currentCode);

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
            // Enhance the last error with the define instructions
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
      }

      // No compile function - return code as-is
      reportProgress('success', 'Code generated (no compilation test)');
      return {
        code: currentCode,
        success: true,
        attempts: attempt,
        progress: progressLog,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reportProgress('failed', `Error: ${errorMessage}`);

      if (attempt >= maxAttempts) {
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
async function generateCode(provider: AIProvider, userPrompt: string): Promise<string> {
  const systemPrompt = buildSystemPrompt();
  const fullPrompt = `${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}`;

  const response = await provider.generateShader(fullPrompt);
  const code = response.code || '';

  // Try to extract GLSL if response includes prose
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

  // Try to extract GLSL if response includes prose
  const extracted = extractGLSLFromResponse(fixedCode);
  return extracted || fixedCode;
}
