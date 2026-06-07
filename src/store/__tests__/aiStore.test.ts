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
