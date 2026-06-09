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
  parseTierFromMetadata,
  setClerkUserId,
  getEffectiveUserId,
  getAnonymousUserId,
  migrationMarkerKey,
  hasMigrated,
  markMigrated,
  ANON_USER_ID_KEY,
} from '../auth';

describe('parseTierFromMetadata', () => {
  it('reads tier from publicMetadata', () => {
    expect(parseTierFromMetadata({ tier: 'pro' })).toBe('pro');
    expect(parseTierFromMetadata({ subscriptionTier: 'team' })).toBe('team');
    expect(parseTierFromMetadata({ plan: 'pro' })).toBe('pro');
  });

  it('defaults to free for unknown values', () => {
    expect(parseTierFromMetadata({ tier: 'enterprise' })).toBe('free');
    expect(parseTierFromMetadata(null)).toBe('free');
    expect(parseTierFromMetadata(undefined)).toBe('free');
  });
});

describe('getEffectiveUserId', () => {
  beforeEach(() => {
    installLocalStorageMock();
    storage.clear();
    setClerkUserId(null);
  });

  it('returns clerk id when signed in', () => {
    setClerkUserId('user_clerk123');
    expect(getEffectiveUserId()).toBe('user_clerk123');
  });

  it('falls back to stable anonymous id', () => {
    localStorage.setItem(ANON_USER_ID_KEY, 'anon_test');
    expect(getEffectiveUserId()).toBe('anon_test');
    expect(getAnonymousUserId()).toBe('anon_test');
  });
});

describe('migration markers', () => {
  beforeEach(() => {
    installLocalStorageMock();
    storage.clear();
  });

  it('tracks one-time migration', () => {
    const key = migrationMarkerKey('anon_a', 'user_b');
    expect(key).toBe('sf-migrated-anon_a-to-user_b');
    expect(hasMigrated('anon_a', 'user_b')).toBe(false);
    markMigrated('anon_a', 'user_b');
    expect(hasMigrated('anon_a', 'user_b')).toBe(true);
  });
});