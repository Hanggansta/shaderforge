import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isClerkEnabled, getClerkPublishableKey } from '../clerk-config';

describe('isClerkEnabled', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when env is missing', () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '');
    expect(isClerkEnabled()).toBe(false);
    expect(getClerkPublishableKey()).toBeNull();
  });

  it('is false for fake demo keys', () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_demo-key-for-development');
    expect(isClerkEnabled()).toBe(false);
  });

  it('is true for real-looking Clerk keys', () => {
    const key = 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20kYWJjZGVmZ2hpams';
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', key);
    expect(isClerkEnabled()).toBe(true);
    expect(getClerkPublishableKey()).toBe(key);
  });
});