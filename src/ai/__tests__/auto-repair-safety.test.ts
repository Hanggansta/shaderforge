import { describe, it, expect } from 'vitest';
import { canApplyAutoRepair } from '../telemetry/auto-repair-safety';
import type { RepairSnapshot, EditorStateSnapshot } from '../telemetry/auto-repair-safety';

const snapshot: RepairSnapshot = {
  requestId: 'req-123',
  code: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0); }',
};

function state(overrides: Partial<EditorStateSnapshot> = {}): EditorStateSnapshot {
  return {
    codeSource: 'ai_generation',
    lastRequestId: 'req-123',
    code: snapshot.code,
    ...overrides,
  };
}

describe('canApplyAutoRepair', () => {
  it('returns true for unchanged AI generation state', () => {
    expect(canApplyAutoRepair(snapshot, state())).toBe(true);
  });

  it('returns false when manual edit changed codeSource to manual', () => {
    expect(canApplyAutoRepair(snapshot, state({ codeSource: 'manual' }))).toBe(false);
  });

  it('returns false when codeSource is quality_repair', () => {
    expect(canApplyAutoRepair(snapshot, state({ codeSource: 'quality_repair' }))).toBe(false);
  });

  it('returns false when lastRequestId is null (manual edit)', () => {
    expect(canApplyAutoRepair(snapshot, state({ lastRequestId: null }))).toBe(false);
  });

  it('returns false when requestId changed (new generation)', () => {
    expect(canApplyAutoRepair(snapshot, state({ lastRequestId: 'req-456' }))).toBe(false);
  });

  it('returns false when code changed but requestId same', () => {
    expect(canApplyAutoRepair(snapshot, state({ code: 'modified code' }))).toBe(false);
  });

  it('returns false when both codeSource and code changed', () => {
    expect(canApplyAutoRepair(snapshot, state({ codeSource: 'manual', code: 'edited' }))).toBe(false);
  });
});
