/**
 * aiStore helpers — clamp + persistence tests for the V2 maxAttempts field.
 *
 * The store itself is React state and lives in the browser; we test the
 * pure helpers that the store wires together. Persistence to localStorage
 * is covered indirectly (the store's `setMaxAttempts` calls into
 * `persistMaxAttempts` which in turn calls `clampMaxAttempts`).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clampMaxAttempts,
  DEFAULT_MAX_ATTEMPTS,
  MAX_MAX_ATTEMPTS,
  MIN_MAX_ATTEMPTS,
  applyRunResult,
  type TelemetryStats,
} from '../aiStore';

describe('clampMaxAttempts', () => {
  beforeEach(() => {
    // noop — pure helper
  });

  it('returns the value when in range', () => {
    expect(clampMaxAttempts(1)).toBe(1);
    expect(clampMaxAttempts(3)).toBe(3);
    expect(clampMaxAttempts(5)).toBe(5);
  });

  it('clamps below MIN_MAX_ATTEMPTS up to MIN', () => {
    expect(clampMaxAttempts(0)).toBe(MIN_MAX_ATTEMPTS);
    expect(clampMaxAttempts(-1)).toBe(MIN_MAX_ATTEMPTS);
  });

  it('clamps above MAX_MAX_ATTEMPTS down to MAX', () => {
    expect(clampMaxAttempts(6)).toBe(MAX_MAX_ATTEMPTS);
    expect(clampMaxAttempts(99)).toBe(MAX_MAX_ATTEMPTS);
  });

  it('floors fractional values to integers (3.7 -> 3)', () => {
    expect(clampMaxAttempts(3.7)).toBe(3);
    expect(clampMaxAttempts(0.4)).toBe(MIN_MAX_ATTEMPTS);
  });

  it('falls back to DEFAULT_MAX_ATTEMPTS for NaN', () => {
    expect(clampMaxAttempts(Number.NaN)).toBe(DEFAULT_MAX_ATTEMPTS);
  });

  it('exposes consistent constants', () => {
    expect(MIN_MAX_ATTEMPTS).toBe(1);
    expect(MAX_MAX_ATTEMPTS).toBe(5);
    expect(DEFAULT_MAX_ATTEMPTS).toBe(3);
    expect(DEFAULT_MAX_ATTEMPTS).toBeGreaterThanOrEqual(MIN_MAX_ATTEMPTS);
    expect(DEFAULT_MAX_ATTEMPTS).toBeLessThanOrEqual(MAX_MAX_ATTEMPTS);
  });
});

const EMPTY: TelemetryStats = {
  totalRuns: 0,
  firstAttemptSuccess: 0,
  retrySuccess: 0,
  totalFailures: 0,
};

describe('applyRunResult', () => {
  it('counts first-attempt success', () => {
    const next = applyRunResult(EMPTY, true, 1);
    expect(next).toEqual({
      totalRuns: 1,
      firstAttemptSuccess: 1,
      retrySuccess: 0,
      totalFailures: 0,
    });
  });

  it('counts retry success (attempts > 1)', () => {
    const next = applyRunResult(EMPTY, true, 2);
    expect(next.firstAttemptSuccess).toBe(0);
    expect(next.retrySuccess).toBe(1);
    expect(next.totalFailures).toBe(0);
    expect(next.totalRuns).toBe(1);
  });

  it('counts total failure regardless of attempts', () => {
    const next1 = applyRunResult(EMPTY, false, 1);
    expect(next1.totalFailures).toBe(1);
    expect(next1.firstAttemptSuccess).toBe(0);
    expect(next1.retrySuccess).toBe(0);

    const next3 = applyRunResult(EMPTY, false, 3);
    expect(next3.totalFailures).toBe(1);
    expect(next3.retrySuccess).toBe(0);
  });

  it('accumulates across multiple runs', () => {
    let s: TelemetryStats = EMPTY;
    s = applyRunResult(s, true, 1);   // 1/1 first-try
    s = applyRunResult(s, true, 2);   // 1 retry-success
    s = applyRunResult(s, false, 3);  // 1 failure
    s = applyRunResult(s, true, 1);   // 1/1 first-try
    expect(s).toEqual({
      totalRuns: 4,
      firstAttemptSuccess: 2,
      retrySuccess: 1,
      totalFailures: 1,
    });
  });

  it('treats attempts <= 0 as first attempt (defensive floor)', () => {
    const next = applyRunResult(EMPTY, true, 0);
    expect(next.firstAttemptSuccess).toBe(1);
    expect(next.retrySuccess).toBe(0);
  });

  it('floors fractional attempts to integers', () => {
    const next = applyRunResult(EMPTY, true, 2.7);
    expect(next.retrySuccess).toBe(1);
  });

  it('is pure — does not mutate the input', () => {
    const input: TelemetryStats = {
      totalRuns: 5,
      firstAttemptSuccess: 3,
      retrySuccess: 1,
      totalFailures: 1,
    };
    const snapshot = { ...input };
    applyRunResult(input, true, 2);
    expect(input).toEqual(snapshot);
  });
});
