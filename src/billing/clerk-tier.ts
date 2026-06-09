import { createClerkClient } from '@clerk/backend';
import type { BillingTier } from './creem-webhook.js';

export interface ClerkBillingMetadata {
  tier: BillingTier;
  creemCustomerId?: string;
  creemSubscriptionId?: string;
  creemProductId?: string;
  creemEventId?: string;
  creemUpdatedAt: string;
}

export function createClerkBillingClient(secretKey: string | undefined) {
  if (!secretKey) return null;
  return createClerkClient({ secretKey });
}

export async function updateClerkUserTier(
  secretKey: string | undefined,
  userId: string,
  metadata: ClerkBillingMetadata,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clerk = createClerkBillingClient(secretKey);
  if (!clerk) {
    return { ok: false, error: 'CLERK_SECRET_KEY is not configured' };
  }

  try {
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        tier: metadata.tier,
        subscriptionTier: metadata.tier,
        plan: metadata.tier,
        creemCustomerId: metadata.creemCustomerId,
        creemSubscriptionId: metadata.creemSubscriptionId,
        creemProductId: metadata.creemProductId,
        creemEventId: metadata.creemEventId,
        creemUpdatedAt: metadata.creemUpdatedAt,
      },
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clerk update failed';
    return { ok: false, error: message };
  }
}

export function extractCreemIds(eventObject: Record<string, unknown>): {
  customerId?: string;
  subscriptionId?: string;
} {
  const customer =
    (eventObject.customer as { id?: string } | undefined)?.id
    ?? (eventObject.subscription as { customer?: string } | undefined)?.customer;

  const subscription =
    (eventObject.subscription as { id?: string } | undefined)?.id
    ?? (typeof eventObject.id === 'string' && eventObject.object === 'subscription'
      ? eventObject.id
      : undefined);

  return {
    customerId: typeof customer === 'string' ? customer : undefined,
    subscriptionId: typeof subscription === 'string' ? subscription : undefined,
  };
}