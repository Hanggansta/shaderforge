import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { isClerkEnabled } from '../lib/clerk-config';
import { parseTierFromMetadata } from '../lib/auth';
import { useUsageStore } from '../store/usageStore';

type ActivationState = 'polling' | 'active' | 'pending';

function BillingSuccessClerk() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [activation, setActivation] = useState<ActivationState>('polling');

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return undefined;

    let cancelled = false;

    const syncTier = async (attempt: number) => {
      await user.reload();
      if (cancelled) return;

      const tier = parseTierFromMetadata(user.publicMetadata as Record<string, unknown>);
      useUsageStore.getState().syncFromAuth({ userId: user.id, tier });

      if (tier === 'pro' || tier === 'team') {
        setActivation('active');
        window.dispatchEvent(new CustomEvent('billing-refresh'));
        return;
      }

      if (attempt < 8) {
        window.setTimeout(() => { void syncTier(attempt + 1); }, 2000);
      } else {
        setActivation('pending');
      }
    };

    void syncTier(0);

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user]);

  const status: ActivationState | 'loading' | 'sign-in-required' = !isLoaded
    ? 'loading'
    : !isSignedIn
      ? 'sign-in-required'
      : activation;

  return (
    <div className="route-fallback" style={{ minHeight: '70vh' }}>
      <div className="route-fallback-mark" aria-hidden="true" />
      {status === 'loading' || status === 'polling' ? (
        <>
          <h1 className="text-strong" style={{ fontSize: 22 }}>Activating your plan…</h1>
          <p className="text-muted" style={{ maxWidth: 420, textAlign: 'center', lineHeight: 1.5 }}>
            Payment received via Creem. We&apos;re syncing your Pro access now — this usually takes a few seconds.
          </p>
        </>
      ) : null}
      {status === 'active' ? (
        <>
          <h1 className="text-strong" style={{ fontSize: 22, color: 'var(--cool-cyan)' }}>You&apos;re on Pro</h1>
          <p className="text-muted" style={{ maxWidth: 420, textAlign: 'center' }}>
            Visual polish, higher quota, and priority reranking are unlocked.
          </p>
          <Link to="/studio" className="btn-cyber primary" style={{ marginTop: 8, textDecoration: 'none' }}>
            Open Studio
          </Link>
        </>
      ) : null}
      {status === 'pending' || status === 'sign-in-required' ? (
        <>
          <h1 className="text-strong" style={{ fontSize: 22 }}>Payment received</h1>
          <p className="text-muted" style={{ maxWidth: 480, textAlign: 'center', lineHeight: 1.5 }}>
            {status === 'sign-in-required'
              ? 'Sign in with the same account you used before checkout so we can link your subscription.'
              : 'Pro activation is still processing. Refresh in a minute or contact support if access does not appear.'}
          </p>
          <Link to="/studio" className="btn-ghost" style={{ marginTop: 8, textDecoration: 'none' }}>
            Back to Studio
          </Link>
        </>
      ) : null}
    </div>
  );
}

export default function BillingSuccess() {
  if (!isClerkEnabled()) {
    return (
      <div className="route-fallback" style={{ minHeight: '70vh' }}>
        <h1 className="text-strong" style={{ fontSize: 22 }}>Payment received</h1>
        <p className="text-muted" style={{ maxWidth: 480, textAlign: 'center' }}>
          Configure Clerk to activate paid tiers automatically. Until then, use demo billing locally.
        </p>
        <Link to="/" className="btn-cyber primary" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>
    );
  }

  return <BillingSuccessClerk />;
}