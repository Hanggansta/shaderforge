/**
 * Service tests — ShaderAgentService delegation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShaderAgentService } from '../integration/service';
import { __resetRunsStore } from '../runs/runs';
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

describe('ShaderAgentService', () => {
  let svc: ShaderAgentService;

  beforeEach(() => {
    __resetRunsStore();
    svc = new ShaderAgentService();
  });

  it('generate returns a GenerateResult', async () => {
    const result = await svc.generate('a purple nebula');
    expect(result.code).toContain('void mainImage');
    expect(result.visualCard.intent).toBe('create');
    expect(typeof result.compileReport.ok).toBe('boolean');
  }, 30_000);

  it('generateAsAgentResult returns the legacy AgentResult shape', async () => {
    const result = await svc.generateAsAgentResult('a purple nebula');
    expect(result.code).toContain('void mainImage');
    expect(typeof result.success).toBe('boolean');
    expect(Array.isArray(result.progress)).toBe(true);
    expect(result.progress.length).toBeGreaterThan(0);
  }, 30_000);

  it('patchAsAgentResult returns the legacy AgentResult shape', async () => {
    const previousCode = 'precision mediump float; void mainImage(out vec4 c, in vec2 f) { c = vec4(0.5); }';
    const result = await svc.patchAsAgentResult(previousCode, 'make it purple', NEBULA_SPEC);
    expect(result.code).toContain('void mainImage');
    expect(typeof result.success).toBe('boolean');
  }, 30_000);

  it('runs are inspectable via getRuns / getRun', async () => {
    const result = await svc.generate('a test prompt');
    const runs = svc.getRuns();
    expect(runs.length).toBe(1);
    expect(svc.getRun(result.runId)).not.toBeNull();
    expect(svc.getRun('does-not-exist')).toBeNull();
  }, 30_000);

  it('setProvider swaps the underlying provider', () => {
    const newProvider = {
      name: 'test',
      isConfigured: () => true,
      configure: () => {},
      generateShader: async () => ({ code: '', success: true, attempts: 0 } as never),
      modifyShader: async () => ({ code: '', success: true, attempts: 0 } as never),
      fixShader: async () => ({ code: '', success: true, attempts: 0 } as never),
      explainShader: async () => ({ explanation: '' } as never),
      chatCompletion: async () => '',
    };
    svc.setProvider(newProvider as never);
    expect(svc.getProvider().name).toBe('test');
  });
});
