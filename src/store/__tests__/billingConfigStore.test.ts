import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useBillingConfigStore } from '../billingConfigStore';

describe('billingConfigStore', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEMO_BILLING', '');
    vi.stubEnv('VITE_CREEM_CHECKOUT_PRO_URL', '');
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '');
    useBillingConfigStore.setState({
      demoBilling: false,
      creemConfigured: false,
      clerkConfigured: false,
      loaded: false,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('merges runtime demo billing from /api/health', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        client: {
          demoBilling: true,
          creemCheckoutPro: false,
          clerkPublishable: false,
        },
      }),
    }));

    await useBillingConfigStore.getState().refresh();

    expect(useBillingConfigStore.getState().demoBilling).toBe(true);
    expect(useBillingConfigStore.getState().loaded).toBe(true);
  });

  it('prefers build-time flags when already set', async () => {
    vi.stubEnv('VITE_DEMO_BILLING', 'true');
    vi.stubEnv('VITE_CREEM_CHECKOUT_PRO_URL', 'https://creem.io/payment/prod_test');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        client: {
          demoBilling: false,
          creemCheckoutPro: false,
          clerkPublishable: true,
        },
      }),
    }));

    await useBillingConfigStore.getState().refresh();

    const state = useBillingConfigStore.getState();
    expect(state.demoBilling).toBe(true);
    expect(state.creemConfigured).toBe(true);
    expect(state.clerkConfigured).toBe(true);
  });
});