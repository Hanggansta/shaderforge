import { create } from 'zustand';
import { isDemoBillingEnabled } from '../lib/auth';
import { isCreemConfigured } from '../lib/creem';

export interface BillingConfigSnapshot {
  demoBilling: boolean;
  creemConfigured: boolean;
  clerkConfigured: boolean;
}

interface BillingConfigState extends BillingConfigSnapshot {
  loaded: boolean;
  refresh: () => Promise<void>;
}

function buildTimeSnapshot(): BillingConfigSnapshot {
  return {
    demoBilling: isDemoBillingEnabled(),
    creemConfigured: isCreemConfigured(),
    clerkConfigured: Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()),
  };
}

export const useBillingConfigStore = create<BillingConfigState>((set) => ({
  ...buildTimeSnapshot(),
  loaded: false,
  refresh: async () => {
    const base = buildTimeSnapshot();
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        set({ ...base, loaded: true });
        return;
      }
      const data = await res.json() as {
        client?: {
          demoBilling?: boolean;
          creemCheckoutPro?: boolean;
          clerkPublishable?: boolean;
        };
      };
      const client = data.client;
      set({
        demoBilling: base.demoBilling || Boolean(client?.demoBilling),
        creemConfigured: base.creemConfigured || Boolean(client?.creemCheckoutPro),
        clerkConfigured: base.clerkConfigured || Boolean(client?.clerkPublishable),
        loaded: true,
      });
    } catch {
      set({ ...base, loaded: true });
    }
  },
}));