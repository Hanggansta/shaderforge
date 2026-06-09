import { create } from 'zustand';
import type { SubscriptionTier } from '../lib/auth';

export interface UsageState {
  generationsThisPeriod: number;
  periodLimit: number;
  tier: SubscriptionTier;
  lastReset: number;
  activeUserId: string | null;

  incrementGeneration: () => boolean;
  setTier: (tier: SubscriptionTier) => void;
  syncFromAuth: (input: { userId: string; tier: SubscriptionTier }) => void;
  migrateUsage: (fromUserId: string, toUserId: string) => void;
  resetIfNeeded: () => void;
  canGenerate: () => boolean;
  remaining: () => number;
}

const FREE_LIMIT = 10;
const PRO_LIMIT = 200;
const LEGACY_USAGE_KEY = 'sf-usage';

interface UsageSnapshot {
  generationsThisPeriod: number;
  lastReset: number;
  tier: SubscriptionTier;
}

function usageStorageKey(userId: string): string {
  return `sf-usage-${userId}`;
}

function loadUsageForUser(userId: string): UsageSnapshot {
  try {
    const raw = localStorage.getItem(usageStorageKey(userId));
    if (raw) return JSON.parse(raw) as UsageSnapshot;
  } catch {
    // ignore
  }

  // One-time migration from legacy global key
  try {
    const legacy = localStorage.getItem(LEGACY_USAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as UsageSnapshot;
      persistUsage(userId, parsed);
      localStorage.removeItem(LEGACY_USAGE_KEY);
      return parsed;
    }
  } catch {
    // ignore
  }

  return { generationsThisPeriod: 0, lastReset: Date.now(), tier: 'free' };
}

function persistUsage(userId: string, snapshot: UsageSnapshot): void {
  try {
    localStorage.setItem(usageStorageKey(userId), JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

function periodLimitForTier(tier: SubscriptionTier): number {
  return tier === 'free' ? FREE_LIMIT : PRO_LIMIT;
}

function getSnapshot(state: UsageState): UsageSnapshot {
  return {
    generationsThisPeriod: state.generationsThisPeriod,
    lastReset: state.lastReset,
    tier: state.tier,
  };
}

export const useUsageStore = create<UsageState>((set, get) => ({
  generationsThisPeriod: 0,
  periodLimit: FREE_LIMIT,
  tier: 'free',
  lastReset: Date.now(),
  activeUserId: null,

  syncFromAuth: ({ userId, tier }) => {
    const stored = loadUsageForUser(userId);
    const effectiveTier = tier;
    set({
      activeUserId: userId,
      generationsThisPeriod: stored.generationsThisPeriod,
      lastReset: stored.lastReset,
      tier: effectiveTier,
      periodLimit: periodLimitForTier(effectiveTier),
    });
    persistUsage(userId, { ...stored, tier: effectiveTier });
  },

  migrateUsage: (fromUserId, toUserId) => {
    if (fromUserId === toUserId) return;
    const from = loadUsageForUser(fromUserId);
    const to = loadUsageForUser(toUserId);
    const merged: UsageSnapshot = {
      generationsThisPeriod: Math.max(from.generationsThisPeriod, to.generationsThisPeriod),
      lastReset: Math.max(from.lastReset, to.lastReset),
      tier: to.tier !== 'free' ? to.tier : from.tier,
    };
    persistUsage(toUserId, merged);
    if (get().activeUserId === toUserId) {
      set({
        generationsThisPeriod: merged.generationsThisPeriod,
        lastReset: merged.lastReset,
        tier: merged.tier,
        periodLimit: periodLimitForTier(merged.tier),
      });
    }
  },

  resetIfNeeded: () => {
    const { activeUserId, lastReset } = get();
    if (!activeUserId) return;

    const now = Date.now();
    if (now - lastReset > 1000 * 60 * 60 * 24 * 30) {
      const next = { generationsThisPeriod: 0, lastReset: now };
      const snapshot = { ...getSnapshot(get()), ...next };
      persistUsage(activeUserId, snapshot);
      set(next);
    }
  },

  incrementGeneration: () => {
    const state = get();
    const userId = state.activeUserId;
    if (!userId) return false;

    state.resetIfNeeded();
    const { generationsThisPeriod, periodLimit, tier } = get();

    if (tier === 'pro' || tier === 'team') {
      const next = generationsThisPeriod + 1;
      const snapshot = { ...getSnapshot(get()), generationsThisPeriod: next };
      persistUsage(userId, snapshot);
      set({ generationsThisPeriod: next });
      return true;
    }

    if (generationsThisPeriod >= periodLimit) {
      return false;
    }

    const next = generationsThisPeriod + 1;
    const snapshot = { ...getSnapshot(get()), generationsThisPeriod: next };
    persistUsage(userId, snapshot);
    set({ generationsThisPeriod: next });
    return true;
  },

  setTier: (tier) => {
    const { activeUserId } = get();
    if (!activeUserId) return;

    const limit = periodLimitForTier(tier);
    const snapshot = { ...getSnapshot(get()), tier };
    persistUsage(activeUserId, snapshot);
    set({ tier, periodLimit: limit });
  },

  canGenerate: () => {
    get().resetIfNeeded();
    const { generationsThisPeriod, periodLimit, tier } = get();
    return tier !== 'free' || generationsThisPeriod < periodLimit;
  },

  remaining: () => {
    const { generationsThisPeriod, periodLimit, tier } = get();
    if (tier !== 'free') return 999;
    return Math.max(0, periodLimit - generationsThisPeriod);
  },
}));

export { FREE_LIMIT, PRO_LIMIT, periodLimitForTier, loadUsageForUser, persistUsage };