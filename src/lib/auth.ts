/**
 * Auth identity bridge — connects Clerk (when signed in) to Dexie + usage stores.
 * Non-React code reads the effective user id via getEffectiveUserId().
 */

export type SubscriptionTier = 'free' | 'pro' | 'team';

export const ANON_USER_ID_KEY = 'sf-user-id';
const MIGRATION_PREFIX = 'sf-migrated';

let clerkUserId: string | null = null;

export function setClerkUserId(id: string | null): void {
  clerkUserId = id;
}

export function getClerkUserId(): string | null {
  return clerkUserId;
}

/** Stable anonymous id for guests — persisted in localStorage. */
export function getAnonymousUserId(): string {
  try {
    const existing = localStorage.getItem(ANON_USER_ID_KEY);
    if (existing) return existing;
    const id = `anon_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(ANON_USER_ID_KEY, id);
    return id;
  } catch {
    return 'anon_fallback';
  }
}

/** Clerk id when signed in; otherwise the anonymous guest id. */
export function getEffectiveUserId(): string {
  return clerkUserId ?? getAnonymousUserId();
}

export function parseTierFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): SubscriptionTier {
  const raw = metadata?.tier ?? metadata?.subscriptionTier ?? metadata?.plan;
  if (raw === 'pro' || raw === 'team') return raw;
  return 'free';
}

export function migrationMarkerKey(fromUserId: string, toUserId: string): string {
  return `${MIGRATION_PREFIX}-${fromUserId}-to-${toUserId}`;
}

export function hasMigrated(fromUserId: string, toUserId: string): boolean {
  try {
    return localStorage.getItem(migrationMarkerKey(fromUserId, toUserId)) === '1';
  } catch {
    return false;
  }
}

export function markMigrated(fromUserId: string, toUserId: string): void {
  try {
    localStorage.setItem(migrationMarkerKey(fromUserId, toUserId), '1');
  } catch {
    // ignore
  }
}

export function isDemoBillingEnabled(): boolean {
  return import.meta.env.VITE_DEMO_BILLING === 'true';
}

/** @deprecated Use getCreemCheckoutUrl from ./creem.ts */
export function getCheckoutUrl(tier: 'pro' | 'team'): string | undefined {
  const creem = tier === 'pro'
    ? import.meta.env.VITE_CREEM_CHECKOUT_PRO_URL
    : import.meta.env.VITE_CREEM_CHECKOUT_TEAM_URL;
  if (creem) return creem as string;

  if (tier === 'pro') {
    return import.meta.env.VITE_STRIPE_CHECKOUT_PRO_URL as string | undefined;
  }
  return import.meta.env.VITE_STRIPE_CHECKOUT_TEAM_URL as string | undefined;
}