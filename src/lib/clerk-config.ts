/** True when a real Clerk publishable key is configured. */
export function isClerkEnabled(): boolean {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!key || typeof key !== 'string') return false;

  const trimmed = key.trim();
  if (!/^pk_(test|live)_/.test(trimmed)) return false;
  if (trimmed.includes('demo-key') || trimmed.includes('your_key')) return false;
  // Real Clerk publishable keys are long encoded strings (not short placeholders).
  return trimmed.length >= 40;
}

export function getClerkPublishableKey(): string | null {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!isClerkEnabled() || !key) return null;
  return key.trim();
}