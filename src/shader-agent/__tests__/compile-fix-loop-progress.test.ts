/**
 * Compile-Fix Loop — onAttempt callback tests.
 *
 * V2: the loop emits per-attempt events so the UI can show retry status
 * to the user. The loop's algorithm is unchanged; this test verifies the
 * new observer fires in the right order with the right payload.
 *
 * In vitest (no DOM) the WebGL2 compile always fails, so the typical
 * path is: compiling -> fixing -> compiling -> fixing -> ... -> failed.
 * The success path is exercised via a mock LLMClient that returns
 * pre-baked code in the "fix" round, but compile still fails in vitest
 * regardless of the code we hand it.
 */

import { describe, it, expect, vi } from 'vitest';
import { runCompileFixLoop, type CompileAttemptEvent } from '../workflows/compile-fix-loop';
import type { LLMClient } from '../llm-client';
import type { VisualCard } from '../schemas/visual-card';
import type { ShaderPlan } from '../schemas/shader-plan';

const VISUAL: VisualCard = {
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

const PLAN: ShaderPlan = {
  baseTechnique: 'fbm_nebula',
  coordinateSystem: 'cartesian',
  noise: 'fbm',
  motion: 'time_drift',
  colorMethod: 'palette_gradient',
  effects: [],
  composition: 'fullscreen_texture',
  performance: 'desktop_balanced',
  maxLoopBudget: 48,
  avoid: [],
  promptHints: [],
};

const NOOP_LLM: LLMClient = {
  async generateText() {
    return 'void mainImage(out vec4 c, in vec2 f) { c = vec4(1.0); }';
  },
  async generateJson() {
    return { value: null, rawText: '', provider: 'test' };
  },
};

function makeInput(maxAttempts: number, onAttempt?: (e: CompileAttemptEvent) => void) {
  return {
    llm: NOOP_LLM,
    visualCard: VISUAL,
    shaderPlan: PLAN,
    references: [],
    userPrompt: 'test',
    initialCode: 'void mainImage(out vec4 c, in vec2 f) { c = vec4(1.0); }',
    initialRawResponse: '',
    maxAttempts,
    ...(onAttempt ? { onAttempt } : {}),
  };
}

describe('runCompileFixLoop — onAttempt callback (V2 retry status)', () => {
  it('fires compiling, then fixing for each failed attempt that has a next', async () => {
    const events: CompileAttemptEvent[] = [];
    await runCompileFixLoop(makeInput(3, (e) => events.push(e)));

    // In vitest the compile always fails, so for maxAttempts=3 we get:
    //   compiling 1, fixing 1, compiling 2, fixing 2, compiling 3, failed 3
    expect(events.map((e) => e.status)).toEqual([
      'compiling',
      'fixing',
      'compiling',
      'fixing',
      'compiling',
      'failed',
    ]);
  }, 30_000);

  it('reports attempt and maxAttempts on every event', async () => {
    const events: CompileAttemptEvent[] = [];
    await runCompileFixLoop(makeInput(2, (e) => events.push(e)));
    for (const e of events) {
      expect(e.maxAttempts).toBe(2);
      expect(e.attempt).toBeGreaterThanOrEqual(1);
      expect(e.attempt).toBeLessThanOrEqual(2);
    }
  }, 30_000);

  it('attempts on compiling/fixing events are sequential and bounded by maxAttempts', async () => {
    const events: CompileAttemptEvent[] = [];
    await runCompileFixLoop(makeInput(3, (e) => events.push(e)));
    const sequenced = events
      .filter((e) => e.status === 'compiling' || e.status === 'fixing' || e.status === 'failed')
      .map((e) => e.attempt);
    expect(sequenced).toEqual([1, 1, 2, 2, 3, 3]);
  }, 30_000);

  it('fires final "failed" event with errorSummary when all attempts exhaust', async () => {
    const events: CompileAttemptEvent[] = [];
    await runCompileFixLoop(makeInput(2, (e) => events.push(e)));
    const last = events[events.length - 1];
    expect(last.status).toBe('failed');
    expect(last.attempt).toBe(2);
    expect(last.maxAttempts).toBe(2);
    expect(typeof last.errorSummary === 'string' || last.errorSummary === undefined).toBe(true);
  }, 30_000);

  it('does not crash when onAttempt is omitted (backward compatible)', async () => {
    // Pass a 2-attempt loop with no onAttempt — must complete without throwing.
    const out = await runCompileFixLoop(makeInput(2));
    expect(out.attempts).toBe(2);
    expect(Array.isArray(out.reports)).toBe(true);
  }, 30_000);

  it('does not change the loop result when onAttempt is provided', async () => {
    const out = await runCompileFixLoop(makeInput(2, () => {}));
    expect(out.attempts).toBe(2);
    expect(out.reports.length).toBe(2);
    expect(out.reports.every((r) => r.ok === false)).toBe(true);
  }, 30_000);

  it('runs to success when LLM returns compiling-friendly code (no-op LLM here, so compile still fails — verifies the observer is decoupled from the algorithm)', async () => {
    // Use a spy to ensure callback is invoked even if the algorithm
    // exhausts all attempts. (compile always fails in vitest.)
    const spy = vi.fn();
    await runCompileFixLoop(makeInput(1, spy));
    expect(spy).toHaveBeenCalled();
    const statuses = spy.mock.calls.map((c) => (c[0] as CompileAttemptEvent).status);
    expect(statuses).toContain('compiling');
    // For maxAttempts=1, no fixing event fires (no retries), only final 'failed'.
    expect(statuses).toEqual(['compiling', 'failed']);
  }, 30_000);
});
