/**
 * Adapter tests — `runArtifactToWorkflowRun` shape and field mapping.
 */

import { describe, it, expect } from 'vitest';
import { runArtifactToWorkflowRun } from '../adapters/runArtifactToWorkflowRun';
import type { RunArtifact } from '../../../shader-agent/runs/runs';
import type { CompileReport } from '../../../shader-agent/schemas/compile-report';

function makeArtifact(overrides: Partial<RunArtifact> = {}): RunArtifact {
  const baseCompileOk: CompileReport = {
    ok: true,
    errors: [],
    rawLog: '',
    durationMs: 95,
  };
  return {
    id: 'run-test-1',
    createdAt: 1_000_000,
    userPrompt: 'a test shader',
    visualCard: { intent: 'create' } as RunArtifact['visualCard'],
    shaderPlan: { baseTechnique: 'sdf' } as unknown as RunArtifact['shaderPlan'],
    references: [],
    compileAttempts: [baseCompileOk],
    finalCode: 'void mainImage() {}',
    attempts: 1,
    success: true,
    ...overrides,
  };
}

describe('runArtifactToWorkflowRun', () => {
  it('builds 6 steps for a single-attempt success', () => {
    const run = runArtifactToWorkflowRun(makeArtifact());
    expect(run.steps.map((s) => s.kind)).toEqual([
      'visual_structurer',
      'shader_planner',
      'reference_selector',
      'code_agent_generate',
      'shader_compiler',
      'screenshot_renderer',
    ]);
    expect(run.status).toBe('success');
    expect(run.finalCode).toBe('void mainImage() {}');
  });

  it('reconstructs compile retries from compileAttempts', () => {
    const run = runArtifactToWorkflowRun(
      makeArtifact({
        compileAttempts: [
          { ok: false, errors: [{ line: 1, message: 'x', category: 'syntax' }], rawLog: '', durationMs: 90 },
          { ok: false, errors: [{ line: 2, message: 'y', category: 'syntax' }], rawLog: '', durationMs: 80 },
          { ok: true, errors: [], rawLog: '', durationMs: 95 },
        ],
        success: true,
        attempts: 3,
      }),
    );
    const compileSteps = run.steps.filter((s) => s.kind === 'shader_compiler');
    expect(compileSteps).toHaveLength(3);
    expect(compileSteps[0].status).toBe('error');
    expect(compileSteps[2].status).toBe('success');
    const fixRetrySteps = run.steps.filter((s) => s.kind === 'code_agent_fix_compile');
    expect(fixRetrySteps.length).toBe(2);
  });

  it('marks final run as failed when no compile attempt passed', () => {
    const run = runArtifactToWorkflowRun(
      makeArtifact({
        success: false,
        attempts: 2,
        finalCode: 'void bad() {}',
        compileAttempts: [
          { ok: false, errors: [{ line: 1, message: 'x', category: 'syntax' }], rawLog: '', durationMs: 90 },
          { ok: false, errors: [{ line: 1, message: 'y', category: 'syntax' }], rawLog: '', durationMs: 90 },
        ],
      }),
    );
    expect(run.status).toBe('failed');
    expect(run.steps.some((s) => s.kind === 'screenshot_renderer')).toBe(false);
  });

  it('skips screenshot step when no screenshots present', () => {
    const run = runArtifactToWorkflowRun(makeArtifact({ success: true, screenshots: undefined }));
    expect(run.steps.some((s) => s.kind === 'screenshot_renderer' && s.status !== 'skipped')).toBe(false);
  });

  it('preserves per-compile-attempt durationMs', () => {
    const run = runArtifactToWorkflowRun(
      makeArtifact({
        compileAttempts: [
          { ok: true, errors: [], rawLog: '', durationMs: 142 },
        ],
      }),
    );
    const compile = run.steps.find((s) => s.kind === 'shader_compiler');
    expect(compile?.durationMs).toBe(142);
  });

  it('captures compile errors in step.error.message', () => {
    const run = runArtifactToWorkflowRun(
      makeArtifact({
        success: false,
        compileAttempts: [
          { ok: false, errors: [{ line: 42, message: "Use of undeclared identifier 'iPolar'", category: 'undeclared' }], rawLog: '', durationMs: 90 },
        ],
      }),
    );
    const compile = run.steps.find((s) => s.kind === 'shader_compiler');
    expect(compile?.status).toBe('error');
    expect(compile?.error?.message).toContain('L42');
    expect(compile?.error?.message).toContain('iPolar');
  });

  it('sums compile durations as totalDurationMs', () => {
    const run = runArtifactToWorkflowRun(
      makeArtifact({
        compileAttempts: [
          { ok: true, errors: [], rawLog: '', durationMs: 100 },
        ],
      }),
    );
    expect(run.totalDurationMs).toBe(100);
  });

  it('passes through userPrompt, visualCard, references, visualScore', () => {
    const run = runArtifactToWorkflowRun(
      makeArtifact({
        userPrompt: 'p',
        visualScore: 91,
        references: [{ id: 'r1', title: 'R', kind: 'golden' } as RunArtifact['references'][number]],
      }),
    );
    expect(run.userPrompt).toBe('p');
    expect(run.visualScore).toBe(91);
    expect(run.references?.length).toBe(1);
  });
});
