export type BillingTier = 'free' | 'pro' | 'team';

export type CreemGrantEvent =
  | 'checkout.completed'
  | 'subscription.paid'
  | 'subscription.active'
  | 'subscription.trialing';

export type CreemRevokeEvent =
  | 'subscription.canceled'
  | 'subscription.expired';

export interface CreemWebhookEnvelope {
  id: string;
  eventType: string;
  created_at: number;
  object: Record<string, unknown>;
}

export interface ProductTierMap {
  pro: string[];
  team: string[];
}

export interface TierResolution {
  tier: BillingTier;
  productId: string;
}

export function parseCreemWebhook(payload: string): CreemWebhookEnvelope | null {
  try {
    const parsed = JSON.parse(payload) as CreemWebhookEnvelope;
    if (!parsed?.eventType || typeof parsed.object !== 'object' || !parsed.object) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractUserId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;

  const candidates = [
    metadata.userId,
    metadata.referenceId,
    metadata.internal_customer_id,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function readProductId(value: unknown): string | null {
  if (typeof value === 'string' && value.startsWith('prod_')) return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id.startsWith('prod_')) return id;
  }
  return null;
}

export function getMetadataFromEvent(event: CreemWebhookEnvelope): Record<string, unknown> {
  const root = event.object;
  const nested = [
    root.metadata,
    (root.subscription as Record<string, unknown> | undefined)?.metadata,
    (root.checkout as Record<string, unknown> | undefined)?.metadata,
  ];

  for (const candidate of nested) {
    if (candidate && typeof candidate === 'object') {
      return candidate as Record<string, unknown>;
    }
  }

  return {};
}

export function getProductIdFromEvent(event: CreemWebhookEnvelope): string | null {
  const root = event.object;

  const direct = readProductId(root.product);
  if (direct) return direct;

  const orderProduct = readProductId((root.order as Record<string, unknown> | undefined)?.product);
  if (orderProduct) return orderProduct;

  const subscriptionProduct = readProductId(
    (root.subscription as Record<string, unknown> | undefined)?.product,
  );
  if (subscriptionProduct) return subscriptionProduct;

  return null;
}

export function resolveTierFromProductId(
  productId: string,
  map: ProductTierMap,
): BillingTier | null {
  if (map.team.includes(productId)) return 'team';
  if (map.pro.includes(productId)) return 'pro';
  return null;
}

export function isGrantEvent(eventType: string): eventType is CreemGrantEvent {
  return (
    eventType === 'checkout.completed'
    || eventType === 'subscription.paid'
    || eventType === 'subscription.active'
    || eventType === 'subscription.trialing'
  );
}

export function isRevokeEvent(eventType: string, object: Record<string, unknown>): boolean {
  if (eventType === 'subscription.expired') return true;
  if (eventType === 'subscription.canceled') {
    return object.status === 'canceled';
  }
  return false;
}

export function buildProductTierMap(env: {
  proProductIds?: string;
  teamProductIds?: string;
}): ProductTierMap {
  const split = (raw?: string) =>
    (raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('prod_'));

  return {
    pro: split(env.proProductIds),
    team: split(env.teamProductIds),
  };
}

export function processCreemWebhookEvent(
  event: CreemWebhookEnvelope,
  productMap: ProductTierMap,
): {
  action: 'grant' | 'revoke' | 'ignore';
  userId: string | null;
  tier: BillingTier | null;
  productId: string | null;
  reason?: string;
} {
  const metadata = getMetadataFromEvent(event);
  const userId = extractUserId(metadata);
  const productId = getProductIdFromEvent(event);

  if (isRevokeEvent(event.eventType, event.object)) {
    return {
      action: 'revoke',
      userId,
      tier: 'free',
      productId,
      reason: event.eventType,
    };
  }

  if (!isGrantEvent(event.eventType)) {
    return {
      action: 'ignore',
      userId,
      tier: null,
      productId,
      reason: `Unhandled event: ${event.eventType}`,
    };
  }

  if (!userId) {
    return {
      action: 'ignore',
      userId: null,
      tier: null,
      productId,
      reason: 'Missing metadata userId/referenceId',
    };
  }

  if (!productId) {
    return {
      action: 'ignore',
      userId,
      tier: null,
      productId: null,
      reason: 'Missing product id on event',
    };
  }

  const tier = resolveTierFromProductId(productId, productMap);
  if (!tier) {
    return {
      action: 'ignore',
      userId,
      tier: null,
      productId,
      reason: `Unknown product id: ${productId}`,
    };
  }

  // Prefer subscription.paid for activation; checkout.completed can duplicate — still idempotent.
  return {
    action: 'grant',
    userId,
    tier,
    productId,
  };
}