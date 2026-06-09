/**
 * Creem checkout helpers (Merchant of Record).
 * @see https://docs.creem.io/features/checkout/checkout-link
 */

export interface CreemCheckoutOptions {
  userId?: string;
  discountCode?: string;
  campaign?: string;
}

export function getCreemCheckoutUrl(
  tier: 'pro' | 'team',
  options: CreemCheckoutOptions = {},
): string | undefined {
  const raw = tier === 'pro'
    ? import.meta.env.VITE_CREEM_CHECKOUT_PRO_URL
    : import.meta.env.VITE_CREEM_CHECKOUT_TEAM_URL;

  if (!raw || typeof raw !== 'string' || !raw.trim()) return undefined;

  try {
    const url = new URL(raw.trim());
    url.searchParams.set('theme', 'dark');
    if (options.userId) {
      url.searchParams.set('metadata[userId]', options.userId);
      // Creem SDK / webhook examples use referenceId for account linking
      url.searchParams.set('metadata[referenceId]', options.userId);
    }
    if (options.campaign) {
      url.searchParams.set('metadata[campaign]', options.campaign);
    }
    if (options.discountCode) {
      url.searchParams.set('discount_code', options.discountCode);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

export function isCreemConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_CREEM_CHECKOUT_PRO_URL
    || import.meta.env.VITE_CREEM_CHECKOUT_TEAM_URL,
  );
}