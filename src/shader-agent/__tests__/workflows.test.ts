/**
 * Workflow tests — generate-shader, patch-shader, runs.
 *
 * End-to-end with the no-LLM path. Verify the fixed workflow executes in
 * order: visualCard -> plan -> references -> code -> compile -> (fix loop)
 * -> run artifact.
 *
 * Note: in vitest (no DOM), the WebGL2 compile always fails. The workflow
 * still records compile attempts and saves a RunArtifact — the run is
 * marked as `success: false`. This is the correct in-test behavior; the
 * real compile pass/fail is verified in browser via `npm run dev`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateShader } from '../workflows/generate-shader';
import { patchShader } from '../workflows/patch-shader';
import { runsStore, __resetRunsStore } from '../runs/runs';
import type { VisualCard } from '../schemas/visual-card';

const NEBULA_SPEC: VisualCard = {
  intent: 'create',
  scene: { type: 'nebula', composition: 'fullscreen' },
  material: { type: 'nebula_gas' },
  style: { mood: 'dreamy' },
  motion: { type: 'flow' },
  depth: { approach: 'volumetric' },
  lighting: { model: 'emissive' },
  color: { palette: 'purple_blue' },
  interaction: { type: 'time_only' },
  constraints: {
    target: 'webgl2',
    performance: 'desktop_balanced',
    maxIterations: 48,
    allowRaymarching: false,
    allowTextures: false,
  },
};

describe('Generate Workflow', () => {
  beforeEach(() => {
    __resetRunsStore();
  });

  it('executes the full pipeline from a free-form prompt (no LLM)', async () => {
    const result = await generateShader('a dreamy purple nebula', { llm: null, provider: null });
    expect(result.code).toContain('void mainImage');
    expect(result.visualCard.intent).toBe('create');
    expect(result.shaderPlan).toBeDefined();
    expect(typeof result.compileReport.ok).toBe('boolean');
  }, 30_000);

  it('attaches the run to the runs store', async () => {
    const result = await generateShader('test prompt', { llm: null, provider: null });
    const runs = runsStore.list();
    expect(runs.length).toBe(1);
    expect(runs[0].id).toBe(result.runId);
    expect(typeof runs[0].success).toBe('boolean');
    expect(runs[0].userPrompt).toBe('test prompt');
  }, 30_000);

  it('compile attempts are recorded in order', async () => {
    const result = await generateShader('test', { llm: null, provider: null, maxAttempts: 2 });
    expect(result.compileAttempts.length).toBeGreaterThan(0);
    expect(result.compileAttempts.every((r) => typeof r.ok === 'boolean')).toBe(true);
  }, 30_000);

  it('respects maxAttempts cap', async () => {
    const result = await generateShader('test', { llm: null, provider: null, maxAttempts: 1 });
    expect(result.attempts).toBe(1);
  }, 30_000);
});

describe('Patch Workflow', () => {
  beforeEach(() => {
    __resetRunsStore();
  });

  it('produces a patched shader with run artifact', async () => {
    const previousCode = `precision mediump float;
uniform float iTime;
uniform vec3 iResolution;
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec3 col = vec3(0.5);
  fragColor = vec4(col, 1.0);
}`;
    const result = await patchShader(previousCode, 'make it more purple', NEBULA_SPEC, { llm: null, provider: null });
    expect(result.code).toContain('void mainImage');
    expect(result.compileReport).toBeDefined();
    expect(result.source).toBe('patched');
    const runs = runsStore.list();
    expect(runs.length).toBe(1);
    expect(runs[0].userPrompt).toContain('make it more purple');
  }, 30_000);
});
