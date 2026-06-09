import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  getAnonymousUserId,
  parseTierFromMetadata,
  setClerkUserId,
} from '../../lib/auth';
import { migrateUserData } from '../../lib/db';
import { useProjectStore } from '../../store/projectStore';
import { useUsageStore } from '../../store/usageStore';

/**
 * Keeps Clerk identity in sync with Dexie user scope and usage tier.
 * Mount once inside ClerkProvider (e.g. in App shell).
 */
export function AuthSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const syncFromAuth = useUsageStore((s) => s.syncFromAuth);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return undefined;

    const onBillingRefresh = () => {
      void user.reload().then(() => {
        const tier = parseTierFromMetadata(user.publicMetadata as Record<string, unknown>);
        syncFromAuth({ userId: user.id, tier });
      });
    };

    window.addEventListener('billing-refresh', onBillingRefresh);
    return () => window.removeEventListener('billing-refresh', onBillingRefresh);
  }, [isLoaded, user, syncFromAuth]);

  useEffect(() => {
    if (!isLoaded) return;

    const anonId = getAnonymousUserId();

    if (isSignedIn && user) {
      const clerkId = user.id;
      setClerkUserId(clerkId);

      const tier = parseTierFromMetadata(user.publicMetadata as Record<string, unknown>);
      syncFromAuth({ userId: clerkId, tier });

      if (prevUserIdRef.current !== clerkId) {
        void migrateUserData(anonId, clerkId).then(() => {
          useUsageStore.getState().migrateUsage(anonId, clerkId);
          loadProjects();
        });
      }
      prevUserIdRef.current = clerkId;
      return;
    }

    setClerkUserId(null);
    syncFromAuth({ userId: anonId, tier: 'free' });
    if (prevUserIdRef.current !== anonId) {
      void loadProjects();
    }
    prevUserIdRef.current = anonId;
  }, [isLoaded, isSignedIn, user, loadProjects, syncFromAuth]);

  return null;
}