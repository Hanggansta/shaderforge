import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCreemCheckoutUrl, isCreemConfigured } from '../creem';

describe('getCreemCheckoutUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CREEM_CHECKOUT_PRO_URL', 'https://creem.io/payment/prod_test123');
    vi.stubEnv('VITE_CREEM_CHECKOUT_TEAM_URL', '');
  });

  it('appends theme and metadata params', () => {
    const url = getCreemCheckoutUrl('pro', { userId: 'user_abc', campaign: 'launch' });
    expect(url).toContain('theme=dark');
    expect(url).toContain('metadata%5BuserId%5D=user_abc');
    expect(url).toContain('metadata%5BreferenceId%5D=user_abc');
    expect(url).toContain('metadata%5Bcampaign%5D=launch');
  });

  it('detects configuration', () => {
    expect(isCreemConfigured()).toBe(true);
  });
});