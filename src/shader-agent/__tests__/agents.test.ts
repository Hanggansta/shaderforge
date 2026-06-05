/**
 * Agent tests — Visual Structurer, Shader Planner, Code/Patch Agent.
 *
 * Run the harness without an LLM (keyword inference path). Verify the
 * pipeline returns a well-typed value.
 */

import { describe, it, expect } from 'vitest';
import { runVisualStructurer } from '../agents/visual-structurer';
import { runShaderPlanner } from '../agents/shader-planner';
import { runCodePatchAgent } from '../agents/code-patch-agent';
import { selectReferences } from '../tools/reference-selector';
import { planTechnique } from '../agents/plan-technique';
import { selectGoldenExamples } from '../tools/select-golden-examples';
import { inferSpecFromKeywords } from '../agents/parse-shader-spec';
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

describe('Visual Structurer (Agent 1)', () => {
  it('returns a VisualCard for a free-form prompt without an LLM (keyword inference)', async () => {
    const result = await runVisualStructurer(
      { userPrompt: 'a dreamy purple nebula' },
      null,
      null
    );
    expect(result).toBeDefined();
    expect(result.intent).toBe('create');
    expect(result.style.mood).toBe('dreamy');
  });

  it('infers scene type from keywords when no LLM', () => {
    const spec = inferSpecFromKeywords('a fiery ocean with neon particles');
    expect(spec.scene.type).toMatch(/fire|ocean|particles/);
  });
});

describe('Shader Planner (Agent 2)', () => {
  it('produces a deterministic ShaderPlan from a VisualCard', () => {
    const plan = planTechnique(NEBULA_SPEC);
    expect(plan).toBeDefined();
    expect(plan.coordinateSystem).toBe('centered_uv');
    expect(typeof plan.baseTechnique).toBe('string');
    expect(plan.baseTechnique.length).toBeGreaterThan(0);
  });

  it('runShaderPlanner returns the same shape as planTechnique', () => {
    const plan = runShaderPlanner({ visualCard: NEBULA_SPEC });
    expect(plan).toBeDefined();
  });
});

describe('Reference Selector (Tool 1)', () => {
  it('returns at least one golden card for a nebula plan', () => {
    const plan = planTechnique(NEBULA_SPEC);
    const goldens = selectGoldenExamples(NEBULA_SPEC, plan, 2);
    expect(goldens.length).toBeGreaterThanOrEqual(1);
  });

  it('selectReferences wraps goldens as ReferenceCards', () => {
    const plan = planTechnique(NEBULA_SPEC);
    const { cards, primaryTemplate } = selectReferences(NEBULA_SPEC, plan);
    expect(cards.length).toBeGreaterThanOrEqual(1);
    if (cards.length > 0) {
      expect(cards[0].kind).toBe('golden');
      expect(primaryTemplate).not.toBeNull();
    }
  });
});

describe('Code/Patch Agent (Agent 3)', () => {
  it('returns stub GLSL when no LLM is provided', async () => {
    const plan = planTechnique(NEBULA_SPEC);
    const { cards } = selectReferences(NEBULA_SPEC, plan);
    const result = await runCodePatchAgent(
      {
        mode: 'generate',
        visualCard: NEBULA_SPEC,
        shaderPlan: plan,
        references: cards,
        userPrompt: 'a dreamy nebula',
      },
      null
    );
    expect(result.code).toContain('precision mediump float');
    expect(result.code).toContain('void mainImage');
  });

  it('handles fix_compile_error mode without an LLM', async () => {
    const plan = planTechnique(NEBULA_SPEC);
    const { cards } = selectReferences(NEBULA_SPEC, plan);
    const result = await runCodePatchAgent(
      {
        mode: 'fix_compile_error',
        visualCard: NEBULA_SPEC,
        shaderPlan: plan,
        references: cards,
        previousCode: 'precision mediump float; void main() {}',
        compileReport: {
          ok: false,
          errors: [{ line: 1, message: 'test error', category: 'syntax' }],
          rawLog: 'ERROR: 1: test',
          durationMs: 1,
        },
        userPrompt: 'fix it',
      },
      null
    );
    expect(result.code).toContain('precision mediump float');
  });

  it('handles fix_user_feedback mode without an LLM', async () => {
    const plan = planTechnique(NEBULA_SPEC);
    const { cards } = selectReferences(NEBULA_SPEC, plan);
    const result = await runCodePatchAgent(
      {
        mode: 'fix_user_feedback',
        visualCard: NEBULA_SPEC,
        shaderPlan: plan,
        references: cards,
        previousCode: 'precision mediump float; void mainImage(out vec4 c, in vec2 f) { c = vec4(0.0); }',
        userFeedback: 'make it brighter',
        userPrompt: 'make it brighter',
      },
      null
    );
    expect(result.code).toContain('precision mediump float');
  });
});
