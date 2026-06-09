import { describe, it, expect } from 'vitest';
import {
  extractUserId,
  processCreemWebhookEvent,
  buildProductTierMap,
  getProductIdFromEvent,
} from '../creem-webhook';

const PROD_PRO = 'prod_shaderlumen_pro';
const PROD_TEAM = 'prod_shaderlumen_team';

describe('extractUserId', () => {
  it('reads userId and referenceId', () => {
    expect(extractUserId({ userId: 'user_abc' })).toBe('user_abc');
    expect(extractUserId({ referenceId: 'user_ref' })).toBe('user_ref');
  });
});

describe('processCreemWebhookEvent', () => {
  const map = buildProductTierMap({
    proProductIds: PROD_PRO,
    teamProductIds: PROD_TEAM,
  });

  it('grants pro on subscription.paid', () => {
    const event = {
      id: 'evt_1',
      eventType: 'subscription.paid',
      created_at: Date.now(),
      object: {
        id: 'sub_1',
        object: 'subscription',
        status: 'active',
        product: { id: PROD_PRO },
        metadata: { userId: 'user_test123' },
      },
    };

    const result = processCreemWebhookEvent(event, map);
    expect(result.action).toBe('grant');
    expect(result.tier).toBe('pro');
    expect(result.userId).toBe('user_test123');
  });

  it('revokes on subscription.canceled', () => {
    const event = {
      id: 'evt_2',
      eventType: 'subscription.canceled',
      created_at: Date.now(),
      object: {
        id: 'sub_1',
        object: 'subscription',
        status: 'canceled',
        product: { id: PROD_PRO },
        metadata: { userId: 'user_test123' },
      },
    };

    const result = processCreemWebhookEvent(event, map);
    expect(result.action).toBe('revoke');
    expect(result.tier).toBe('free');
  });

  it('reads product id from checkout.completed', () => {
    const event = {
      id: 'evt_3',
      eventType: 'checkout.completed',
      created_at: Date.now(),
      object: {
        id: 'ch_1',
        object: 'checkout',
        status: 'completed',
        product: { id: PROD_TEAM },
        metadata: { referenceId: 'user_team' },
      },
    };

    expect(getProductIdFromEvent(event)).toBe(PROD_TEAM);
    const result = processCreemWebhookEvent(event, map);
    expect(result.tier).toBe('team');
  });
});