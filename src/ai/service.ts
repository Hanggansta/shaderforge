/**
 * AI Service
 * Main interface for AI shader generation.
 * Uses the agent loop for reliable code generation.
 */

import type { AIProvider, AIIntent } from './adapter';
import { agentLoop, type AgentResult, type AgentProgress } from './agent-loop';
import { MockAIProvider } from './providers/mock';
import { parseShaderSpec } from './spec/parse-shader-spec';
import { planTechnique } from './planner/plan-technique';
import { selectGoldenExamples } from './library/select-golden-examples';
import { parse_modify_intent } from './modify/parse-modify-intent';
import { determineModifyStrategy } from './modify/modify-strategy';
import { parseIntent } from './intent/parse-intent';
import { generateClarificationMessage } from './intent/clarification';
import type { ShaderSpec } from './spec/shader-spec';
import type { TechniquePlan } from './planner/technique-plan';
import type { RenderTelemetry, TelemetryResult } from './telemetry/types';
import type { QualityRepairPlan, RepairType } from './telemetry/quality-repair-plan';
import { captureFrame, analyzePixels, computeBrightness, computeFlickerScore } from './telemetry/analyze-pixels';
import { diagnoseQuality } from './telemetry/quality-diagnosis';
import { createQualityRepairPlan } from './telemetry/quality-repair-plan';
import { deriveQualitySignals } from './telemetry/quality-signals';

export type { AgentResult, AgentProgress };

/** Context from the last generation, used for telemetry */
interface GenerationContext {
  requestId: string;
  prompt: string;
  spec: ShaderSpec;
  plan: TechniquePlan;
}

/** Allowed repair types for auto-repair (low-risk only) */
const AUTO_REPAIR_ALLOWED_TYPES: RepairType[] = [
  'brightness_contrast',
  'color_balance',
  'motion',
  'flicker',
];

/** Dev-only test repair modes */
export type DevTestRepairMode = 'off' | 'repair-success' | 'repair-invalid' | 'repair-api-error' | 'repair-delayed';

/** Valid green shader returned by repair-success and repair-delayed modes */
const DEV_TEST_REPAIR_GREEN_SHADER = `precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = vec3(0.1, 0.6, 0.3);
  col += 0.2 * sin(uv.y * 10.0 + iTime * 2.0);
  col += 0.1 * sin(uv.x * 8.0 - iTime * 1.5);
  fragColor = vec4(col, 1.0);
}`;

export class AIService {
  private provider: AIProvider;
  private abortController: AbortController | null = null;
  private lastGenerationContext: GenerationContext | null = null;
  /** Tracks which requestIds have already attempted auto-repair (one-shot) */
  private autoRepairAttempted: Set<string> = new Set();
  /** Dev-only: controls deterministic repair behavior for E2E testing */
  private devTestRepairMode: DevTestRepairMode = 'off';

  constructor(provider?: AIProvider) {
    this.provider = provider || new MockAIProvider();
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Dev-only: inject a generation context for testing telemetry without live AI.
   * Must be paired with editorStore.setCodeFromAI(code, requestId).
   */
  setTestGenerationContext(requestId: string, prompt: string, spec: ShaderSpec, plan: TechniquePlan): void {
    if (!import.meta.env.DEV) return;
    this.lastGenerationContext = { requestId, prompt, spec, plan };
  }

  /**
   * Dev-only: set deterministic repair mode for E2E testing.
   */
  setDevTestRepairMode(mode: DevTestRepairMode): void {
    if (!import.meta.env.DEV) return;
    this.devTestRepairMode = mode;
    if (mode !== 'off') {
      console.debug('[DevTest] Repair mode set to:', mode);
    }
  }

  /**
   * Dev-only: get current repair test mode.
   */
  getDevTestRepairMode(): DevTestRepairMode {
    return this.devTestRepairMode;
  }

  /**
   * Dev-only: build a hardcoded repair plan for deterministic testing.
   * Returns a low-risk brightness_contrast plan that should pass shouldAutoRepair checks.
   */
  private buildDevTestRepairPlan(): QualityRepairPlan {
    return {
      shouldRepair: true,
      repairType: 'brightness_contrast',
      riskLevel: 'low',
      summary: '[DEV TEST] Deterministic repair plan for E2E testing',
      targetIssues: ['Shader renders as solid black despite vibrant spec'],
      repairHints: ['Add color output based on UV coordinates and time'],
      preserve: ['mainImage entry point', 'uniform declarations'],
      avoid: ['textures', 'iChannel', 'multipass', 'raymarching'],
    };
  }

  /**
   * Generate a shader using the agent loop
   */
  async generate(
    prompt: string,
    intent: AIIntent,
    options: {
      onProgress?: (progress: AgentProgress) => void;
      maxAttempts?: number;
      currentCode?: string;
    } = {}
  ): Promise<AgentResult> {
    this.cancel();
    this.abortController = new AbortController();

    const { onProgress, maxAttempts = 3, currentCode } = options;

    try {
      // Resolve auto intent using LLM
      let resolvedIntent = intent;
      let detectedIntent: AIIntent | undefined;
      if (intent === 'auto') {
        onProgress?.({
          status: 'generating',
          attempt: 0,
          maxAttempts,
          message: 'Understanding your intent...',
        });

        const decision = await parseIntent(prompt, this.provider, {
          hasCode: !!currentCode,
        });
        resolvedIntent = decision.intent;
        detectedIntent = decision.intent;

        if (import.meta.env.DEV) {
          console.debug('[Intent] Auto-detected:', decision);
        }

        // Low-confidence: ask user to clarify instead of executing
        if (decision.shouldAskClarifyingQuestion) {
          const clarification = generateClarificationMessage(!!currentCode);
          return {
            code: '',
            success: true,
            attempts: 0,
            detectedIntent,
            clarification,
            progress: [{
              status: 'success',
              attempt: 0,
              maxAttempts,
              message: clarification,
            }],
          };
        }
      }

      // Build the full prompt based on intent
      let fullPrompt = prompt;

      switch (resolvedIntent) {
        case 'create':
          fullPrompt = `Create a new shader: ${prompt}`;
          break;
        case 'modify':
          fullPrompt = `Modify the current shader: ${prompt}`;
          break;
        case 'fix':
          fullPrompt = `Fix the shader errors: ${prompt}`;
          break;
        case 'explain': {
          // For explain, we don't need the agent loop
          const explanation = await this.provider.explainShader(currentCode || prompt);
          return {
            code: '',
            success: true,
            attempts: 1,
            explanation: explanation.explanation || 'Explanation generated',
            detectedIntent,
            progress: [{
              status: 'success',
              attempt: 1,
              maxAttempts: 1,
              message: explanation.explanation || 'Explanation generated',
            }],
          };
        }
        case 'optimize':
          fullPrompt = `Optimize this shader for better performance: ${prompt}`;
          break;
      }

      // Parse ShaderSpec from the original user prompt
      onProgress?.({
        status: 'generating',
        attempt: 0,
        maxAttempts,
        message: 'Understanding visual intent...',
      });

      const spec = await parseShaderSpec(prompt, this.provider);

      if (import.meta.env.DEV) {
        console.debug('[ShaderSpec] Parsed spec:', JSON.stringify(spec, null, 2));
      }

      // Plan technique from the normalized spec (deterministic, no LLM call)
      onProgress?.({
        status: 'generating',
        attempt: 0,
        maxAttempts,
        message: 'Planning shader technique...',
      });

      const techniquePlan = planTechnique(spec);

      if (import.meta.env.DEV) {
        console.debug('[TechniquePlan] Planned technique:', JSON.stringify(techniquePlan, null, 2));
      }

      // Select golden shader examples (deterministic, no LLM call)
      onProgress?.({
        status: 'generating',
        attempt: 0,
        maxAttempts,
        message: 'Selecting reference shaders...',
      });

      const goldenExamples = selectGoldenExamples(spec, techniquePlan);

      if (import.meta.env.DEV) {
        console.debug('[GoldenExamples] Selected:', goldenExamples.map(e => e.id));
      }

      // Determine modify strategy (only for modify intent)
      let modifyStrategy;
      let modifyIntent;
      if (resolvedIntent === 'modify') {
        // Parse modify intent using AI
        modifyIntent = await parse_modify_intent(prompt, this.provider, {
          currentCode,
          spec: spec as unknown as Record<string, unknown>,
          plan: techniquePlan as unknown as Record<string, unknown>,
          goldenExamples: goldenExamples.map(e => e.id),
        });

        if (import.meta.env.DEV) {
          console.debug('[ModifyIntent]', JSON.stringify(modifyIntent, null, 2));
        }

        // Derive strategy from ModifyIntent
        modifyStrategy = determineModifyStrategy(modifyIntent);

        if (import.meta.env.DEV) {
          console.debug('[ModifyStrategy]', modifyStrategy);
        }
      }

      // Run the agent loop with the parsed spec, technique plan, golden examples, and modify strategy
      const result = await agentLoop(this.provider, fullPrompt, {
        onProgress,
        maxAttempts,
        spec,
        techniquePlan,
        goldenExamples,
        modifyStrategy,
        modifyIntent,
        intent: resolvedIntent,
        editorCode: currentCode,
      });

      // Store generation context for telemetry if successful
      if (result.success && result.code) {
        this.lastGenerationContext = {
          requestId: crypto.randomUUID(),
          prompt,
          spec,
          plan: techniquePlan,
        };
      }

      return { ...result, detectedIntent };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          code: '',
          success: false,
          attempts: 0,
          progress: [{
            status: 'failed',
            attempt: 0,
            maxAttempts,
            message: 'Request cancelled',
          }],
        };
      }

      throw error;
    }
  }

  /**
   * Fix code with compilation errors (convenience method)
   */
  async fixCode(
    code: string,
    errors: string[],
    options: {
      onProgress?: (progress: AgentProgress) => void;
      maxAttempts?: number;
    } = {}
  ): Promise<AgentResult> {
    return this.generate(
      `Fix the compilation errors:\n${errors.join('\n')}\n\nCurrent code:\n${code}`,
      'fix',
      options
    );
  }

  /**
   * Capture render telemetry from the WebGL canvas and run AI quality diagnosis.
   * Also generates a repair plan based on the diagnosis.
   * Call this after a shader has been rendered on the canvas.
   *
   * @param gl - WebGL2 rendering context
   * @param width - Canvas width in pixels
   * @param height - Canvas height in pixels
   * @param requestId - Request ID to prevent stale captures
   * @param currentCode - Current shader code in editor (for auto-repair)
   * @returns Telemetry result with diagnosis and repair plan, or null if stale
   */
  async captureRenderTelemetry(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    requestId: string,
    currentCode?: string
  ): Promise<TelemetryResult | null> {
    const ctx = this.lastGenerationContext;
    if (!ctx || ctx.requestId !== requestId) {
      // No context or stale request - skip
      return null;
    }

    // Clear context to prevent re-capture
    this.lastGenerationContext = null;

    try {
      // Capture 3 frames with short delays for motion/flicker analysis
      const frames: Uint8Array[] = [];
      const brightnesses: number[] = [];
      let capturedWidth = width;
      let capturedHeight = height;

      for (let i = 0; i < 3; i++) {
        const frame = captureFrame(gl, width, height);
        if (!frame) {
          return { success: false, error: 'Failed to capture frame' };
        }
        frames.push(frame.pixels);
        brightnesses.push(computeBrightness(frame.pixels));
        capturedWidth = frame.width;
        capturedHeight = frame.height;

        // Small delay between frames (except after last)
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // Analyze first frame for static metrics (using captured dimensions)
      const metrics = analyzePixels(frames[0], capturedWidth, capturedHeight, frames[1]);

      // Compute flicker score from all 3 frames
      metrics.flickerScore = computeFlickerScore(brightnesses);

      // Build telemetry object
      const telemetry: RenderTelemetry = {
        prompt: ctx.prompt,
        spec: {
          scene: { type: ctx.spec.scene.type },
          style: {
            mood: ctx.spec.style.mood,
            visualDensity: ctx.spec.style.visualDensity,
            contrast: ctx.spec.style.contrast,
            glow: ctx.spec.style.glow,
          },
          motion: {
            type: ctx.spec.motion.type,
            speed: ctx.spec.motion.speed,
            smoothness: ctx.spec.motion.smoothness,
          },
          color: { palette: ctx.spec.color.palette },
        },
        plan: {
          baseTechnique: ctx.plan.baseTechnique,
          motion: ctx.plan.motion,
          colorMethod: ctx.plan.colorMethod,
          effects: ctx.plan.effects,
          maxLoopBudget: ctx.plan.maxLoopBudget,
        },
        metrics,
        capturedAt: Date.now(),
        requestId: ctx.requestId,
      };

      if (import.meta.env.DEV) {
        console.debug('[Telemetry] Captured metrics:', JSON.stringify(telemetry.metrics, null, 2));
      }

      // Derive quality signals (deterministic)
      const signals = deriveQualitySignals(metrics);

      if (import.meta.env.DEV) {
        console.debug('[Telemetry] Quality signals:', JSON.stringify(signals, null, 2));
      }

      // Run AI quality diagnosis
      const diagnosisResult = await diagnoseQuality(this.provider, telemetry);

      if (!diagnosisResult.success) {
        return { success: false, error: diagnosisResult.error };
      }

      const diagnosis = diagnosisResult.diagnosis!;

      if (import.meta.env.DEV) {
        console.debug('[Telemetry] Diagnosis:', JSON.stringify(diagnosis, null, 2));
      }

      // Generate repair plan (only if diagnosis suggests repair)
      let repairPlan;
      if (diagnosis.shouldRepair) {
        // Dev test mode: use hardcoded plan instead of LLM call
        if (import.meta.env.DEV && this.devTestRepairMode !== 'off') {
          repairPlan = this.buildDevTestRepairPlan();
          console.debug('[DevTest] Using hardcoded repair plan:', repairPlan.summary);
        } else {
          const planResult = await createQualityRepairPlan(
            this.provider,
            telemetry,
            signals,
            diagnosis
          );

          if (planResult.success) {
            repairPlan = planResult.plan;
          }
        }

        if (import.meta.env.DEV && repairPlan) {
          console.debug('[Telemetry] Repair plan:', JSON.stringify(repairPlan, null, 2));
        }
      }

      // Attempt controlled auto-repair if criteria are met
      let autoRepair;
      if (repairPlan && currentCode) {
        const repairResult = await this.executeAutoRepair(
          repairPlan,
          telemetry,
          currentCode,
          ctx.requestId
        );

        if (repairResult) {
          autoRepair = {
            attempted: true,
            success: repairResult.success,
            code: repairResult.success ? repairResult.code : undefined,
            error: repairResult.success ? undefined : 'Auto-repair produced invalid code',
          };
        }
      }

      return {
        success: true,
        diagnosis,
        repairPlan,
        autoRepair,
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Telemetry capture failed',
      };
    }
  }

  /**
   * Get the request ID from the last generation context.
   * Returns null if no generation has been done.
   */
  getLastRequestId(): string | null {
    return this.lastGenerationContext?.requestId ?? null;
  }

  /**
   * Check if auto-repair should run for a given repair plan.
   * Returns true only if all safety criteria are met.
   */
  private shouldAutoRepair(repairPlan: QualityRepairPlan, requestId: string): boolean {
    // Must want repair
    if (!repairPlan.shouldRepair) {
      if (import.meta.env.DEV) {
        console.debug('[AutoRepair] Skipped: shouldRepair is false');
      }
      return false;
    }

    // Only low-risk repairs
    if (repairPlan.riskLevel !== 'low') {
      if (import.meta.env.DEV) {
        console.debug('[AutoRepair] Skipped: riskLevel is', repairPlan.riskLevel, '(need low)');
      }
      return false;
    }

    // Only allowed repair types
    if (!AUTO_REPAIR_ALLOWED_TYPES.includes(repairPlan.repairType)) {
      if (import.meta.env.DEV) {
        console.debug('[AutoRepair] Skipped: repairType is', repairPlan.repairType);
      }
      return false;
    }

    // One-shot: must not have already attempted
    if (this.autoRepairAttempted.has(requestId)) {
      if (import.meta.env.DEV) {
        console.debug('[AutoRepair] Skipped: already attempted for requestId', requestId);
      }
      return false;
    }

    return true;
  }

  /**
   * Build a concise repair prompt from a QualityRepairPlan.
   * Preserves current shader structure, makes targeted low-risk changes only.
   */
  private buildRepairPrompt(repairPlan: QualityRepairPlan, telemetry: RenderTelemetry): string {
    const hints = repairPlan.repairHints.join('\n- ');
    const preserve = repairPlan.preserve.join(', ');
    const avoid = repairPlan.avoid.join(', ');

    return `Quality repair: ${repairPlan.summary}

Issues to fix:
${repairPlan.targetIssues.map(i => `- ${i}`).join('\n')}

Repair hints:
- ${hints}

Current metrics:
- Brightness: ${telemetry.metrics.brightness.toFixed(3)}
- Contrast: ${telemetry.metrics.contrast.toFixed(3)}
- Saturation: ${telemetry.metrics.saturation.toFixed(3)}
- Motion: ${telemetry.metrics.frameDelta.toFixed(3)}
- Flicker: ${telemetry.metrics.flickerScore.toFixed(3)}

IMPORTANT RULES:
- Preserve: ${preserve}
- Avoid: ${avoid}
- Make ONLY targeted ${repairPlan.repairType} adjustments
- Do NOT change the scene type or overall structure
- Do NOT add unsupported features (textures, iChannel, multipass)
- Keep the same entry point (mainImage)`;
  }

  /**
   * Execute controlled auto-repair for a quality issue.
   * Runs at most once per requestId, only for low-risk repairs.
   *
   * @returns The repair result, or null if auto-repair was skipped
   */
  async executeAutoRepair(
    repairPlan: QualityRepairPlan,
    telemetry: RenderTelemetry,
    currentCode: string,
    requestId: string
  ): Promise<AgentResult | null> {
    // Check all safety criteria
    if (!this.shouldAutoRepair(repairPlan, requestId)) {
      return null;
    }

    // Mark as attempted BEFORE starting (prevents re-entry)
    this.autoRepairAttempted.add(requestId);

    if (import.meta.env.DEV) {
      console.debug('[AutoRepair] Starting repair:', {
        repairType: repairPlan.repairType,
        riskLevel: repairPlan.riskLevel,
        requestId,
      });
    }

    try {
      const repairPrompt = this.buildRepairPrompt(repairPlan, telemetry);

      // Dev test mode: wrap provider to intercept modifyShader
      let providerForRepair: AIProvider = this.provider;
      if (import.meta.env.DEV && this.devTestRepairMode !== 'off') {
        const mode = this.devTestRepairMode;
        const realProvider = this.provider;
        providerForRepair = {
          ...realProvider,
          isConfigured: () => true,
          generateShader: realProvider.generateShader.bind(realProvider),
          fixShader: async (code: string, errors: string) => {
            console.debug('[DevTest] fixShader intercepted, mode:', mode);
            if (mode === 'repair-invalid' || mode === 'repair-api-error') {
              return { code: 'REPAIR_FIX_INVALID;;;' };
            }
            return realProvider.fixShader(code, errors);
          },
          explainShader: realProvider.explainShader.bind(realProvider),
          chatCompletion: realProvider.chatCompletion.bind(realProvider),
          modifyShader: async () => {
            console.debug('[DevTest] modifyShader intercepted, mode:', mode);
            if (mode === 'repair-api-error') {
              throw new Error('[DevTest] Simulated API failure');
            }
            if (mode === 'repair-invalid') {
              return { code: 'INVALID GLSL;;; {{{' };
            }
            if (mode === 'repair-delayed') {
              console.debug('[DevTest] Delaying repair by 5s...');
              await new Promise(r => setTimeout(r, 5000));
              console.debug('[DevTest] Delay complete, returning code');
            }
            // repair-success and repair-delayed return valid shader
            return { code: DEV_TEST_REPAIR_GREEN_SHADER };
          },
        };
      }

      // Run through agent loop with modify intent (uses modifyShader)
      const result = await agentLoop(providerForRepair, repairPrompt, {
        maxAttempts: 2,  // Fewer attempts for auto-repair
        intent: 'modify',
        editorCode: currentCode,
        disableFallback: true,  // Never use fallback as auto-repair result
      });

      if (import.meta.env.DEV) {
        console.debug('[AutoRepair] Result:', {
          success: result.success,
          attempts: result.attempts,
        });
      }

      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('[AutoRepair] Failed:', error);
      }
      return null;
    }
  }
}

// Singleton instance
export const aiService = new AIService();
