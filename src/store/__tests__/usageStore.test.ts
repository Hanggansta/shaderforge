import { describe, it, expect, beforeEach, vi } from 'vitest';

const storage = new Map<string, string>();

function installLocalStorageMock(): void {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  });
}
import {
  periodLimitForTier,
  loadUsageForUser,
  persistUsage,
  FREE_LIMIT,
  PRO_LIMIT,
} from '../usageStore';

describe('periodLimitForTier', () => {
  it('maps tiers to limits', () => {
    expect(periodLimitForTier('free')).toBe(FREE_LIMIT);
    expect(periodLimitForTier('pro')).toBe(PRO_LIMIT);
    expect(periodLimitForTier('team')).toBe(PRO_LIMIT);
  });
});

describe('per-user usage persistence', () => {
  beforeEach(() => {
    installLocalStorageMock();
    storage.clear();
  });

  it('stores and loads usage per user id', () => {
    persistUsage('user_a', {
      generationsThisPeriod: 3,
      lastReset: 1000,
      tier: 'free',
    });
    persistUsage('user_b', {
      generationsThisPeriod: 7,
      lastReset: 2000,
      tier: 'pro',
    });

    expect(loadUsageForUser('user_a')).toEqual({
      generationsThisPeriod: 3,
      lastReset: 1000,
      tier: 'free',
    });
    expect(loadUsageForUser('user_b').tier).toBe('pro');
  });

  it('returns defaults for unknown users', () => {
    const fresh = loadUsageForUser('user_new');
    expect(fresh.generationsThisPeriod).toBe(0);
    expect(fresh.tier).toBe('free');
  });
});