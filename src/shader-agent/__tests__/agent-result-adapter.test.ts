/**
 * Adapter tests — ShaderResult -> AgentResult mapping.
 *
 * Verifies the bridge from the new harness's return shape to the
 * legacy AgentResult shape that AIService / AIChatPanel consume.
 */

import { describe, it, expect } from 'vitest';
import { adaptGenerateResult, adaptPatchResult } from '../integration/agent-result-adapter';
import type { GenerateResult } from '../workflows/generate-shader';
import type { PatchResult } from '../workflows/patch-shader';
import type { ShaderResult } from '../schemas/shader-result';

const BASE_VISUAL = {
  intent: 'create' as const,
  scene: { type: 'nebula' as const, composition: 'fullscreen' as const },
  material: { type: 'nebula_gas' as const },
  style: { mood: 'dreamy' as const },
  motion: { type: 'flow' as const },
  depth: { approach: 'volumetric' as const },
  lighting: { model: 'emissive' as const },
  color: { palette: 'purple_blue' as const },
  interaction: { type: 'time_only' as const },
  constraints: {
    target: 'webgl2' as const,
    performance: 'desktop_balanced' as const,
    maxIterations: 48,
    allowRaymarching: false as const,
    allowTextures: false as const,
  },
};

const BASE_PLAN = {
  baseTechnique: 'fbm_nebula' as const,
  coordinateSystem: 'centered_uv' as const,
  noise: 'fbm' as const,
  motion: 'time_drift' as const,
  colorMethod: 'palette_gradient' as const,
  effects: ['soft_glow' as const] as ('soft_glow')[],
  composition: 'fullscreen_texture' as const,
  performance: 'desktop_balanced' as const,
  maxLoopBudget: 48,
  avoid: [] as string[],
  promptHints: [] as string[],
};

function buildResult(
  ok: boolean,
  code: string
): Pick<ShaderResult, 'code' | 'visualCard' | 'shaderPlan' | 'references' | 'compileReport'> & {
  runId: string;
  attempts: number;
  compileAttempts: ShaderResult['compileReport'][];
} {
  const report = { ok, errors: ok ? [] : [{ line: 3, message: 'syntax error', category: 'syntax' as const }], rawLog: ok ? '' : 'err', durationMs: 1 };
  return {
    runId: 'test-run-1',
    code,
    attempts: 1,
    visualCard: BASE_VISUAL,
    shaderPlan: BASE_PLAN,
    references: [],
    compileReport: report,
    compileAttempts: [report],
  };
}

describe('adaptGenerateResult', () => {
  it('maps a successful generate to success=true with progress', () => {
    const gen: GenerateResult = buildResult(true, 'precision mediump float; void mainImage() {}') as GenerateResult;
    const result = adaptGenerateResult(gen, { detectedIntent: 'create' });
    expect(result.success).toBe(true);
    expect(result.code).toContain('mainImage');
    expect(result.attempts).toBe(1);
    expect(result.errors).toBeUndefined();
    expect(result.detectedIntent).toBe('create');
    expect(result.progress.length).toBe(1);
    expect(result.progress[0].status).toBe('success');
  });

  it('maps a failed generate to success=false with errors', () => {
    const gen: GenerateResult = buildResult(false, 'precision mediump float; broken') as GenerateResult;
    const result = adaptGenerateResult(gen);
    expect(result.success).toBe(false);
    expect(result.code).toContain('broken');
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].line).toBe(3);
    expect(result.errors?.[0].errorType).toBe('syntax_error');
    expect(result.progress[0].status).toBe('failed');
  });

  it('passes through detectedIntent if provided', () => {
    const gen: GenerateResult = buildResult(true, 'void mainImage() {}') as GenerateResult;
    const result = adaptGenerateResult(gen, { detectedIntent: 'fix' });
    expect(result.detectedIntent).toBe('fix');
  });

  it('builds progress for multi-attempt runs', () => {
    const gen: GenerateResult = buildResult(true, 'void mainImage() {}') as GenerateResult;
    gen.compileAttempts = [
      { ok: false, errors: [], rawLog: 'err1', durationMs: 1 },
      { ok: false, errors: [], rawLog: 'err2', durationMs: 1 },
      { ok: true, errors: [], rawLog: '', durationMs: 1 },
    ];
    gen.attempts = 3;
    const result = adaptGenerateResult(gen);
    expect(result.progress.length).toBe(3);
    expect(result.attempts).toBe(3);
  });
});

describe('adaptPatchResult', () => {
  it('maps a successful patch', () => {
    const patched: PatchResult = buildResult(true, 'void mainImage() {}') as PatchResult;
    const result = adaptPatchResult(patched, { detectedIntent: 'modify' });
    expect(result.success).toBe(true);
    expect(result.detectedIntent).toBe('modify');
  });
});
