import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsageStore } from '../../store/usageStore';
import { modalVariants } from '../../utils/motion';
import { toast } from 'sonner';
import { getEffectiveUserId } from '../../lib/auth';
import { getCreemCheckoutUrl } from '../../lib/creem';
import { useBillingConfigStore } from '../../store/billingConfigStore';
import { isClerkEnabled } from '../../lib/clerk-config';
import { IconClose, IconCheck, IconZap, IconShield, IconSpark } from '../icons/ForgeIcons';

export interface UpgradeModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  isSignedIn: boolean;
  clerkUserId?: string;
  signInSlot?: ReactNode;
}

export function UpgradeModalView({
  isOpen,
  onClose,
  isSignedIn,
  clerkUserId,
  signInSlot,
}: UpgradeModalViewProps) {
  const setTier = useUsageStore((s) => s.setTier);
  const currentTier = useUsageStore((s) => s.tier);
  const demoBilling = useBillingConfigStore((s) => s.demoBilling);
  const creemConfigured = useBillingConfigStore((s) => s.creemConfigured);
  const clerkRequired = isClerkEnabled();

  const handleUpgrade = (tier: 'pro' | 'team') => {
    if (clerkRequired && !isSignedIn) {
      toast.error('Sign in required', {
        description: 'Create an account before upgrading your plan.',
      });
      return;
    }

    if (demoBilling) {
      setTier(tier);
      toast.success(`Welcome to ${tier === 'pro' ? 'Pro' : 'Team'}`, {
        description: 'Demo billing — use Creem webhooks + Clerk metadata in production.',
      });
      onClose();
      return;
    }

    const userId = clerkUserId ?? getEffectiveUserId();
    const checkoutUrl = getCreemCheckoutUrl(tier, {
      userId,
      campaign: 'shaderlumen-upgrade',
    });

    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      toast.info('Complete checkout in the new tab', {
        description: 'Powered by Creem. Your plan updates after payment is confirmed.',
      });
      onClose();
      return;
    }

    toast.error('Checkout not configured', {
      description: tier === 'team'
        ? 'Set VITE_CREEM_CHECKOUT_TEAM_URL in .env.local'
        : 'Set VITE_CREEM_CHECKOUT_PRO_URL in .env.local (from Creem dashboard → product → Share).',
    });
  };

  const billingNote = demoBilling
    ? 'Demo mode — instant upgrade for testing'
    : creemConfigured
      ? 'Cancel anytime · Billed monthly via Creem'
      : 'Cancel anytime · Billed monthly';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
          <motion.div
            className="modal-panel"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
              <IconClose size={20} />
            </button>

            {clerkRequired && !isSignedIn && signInSlot && (
              <div
                className="row row-center row-gap-sm"
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  fontSize: 13,
                }}
              >
                <span className="text-muted">Sign in to upgrade and sync your shaders across devices.</span>
                {signInSlot}
              </div>
            )}

            <div className="modal-grid">
              <div className="modal-tier">
                <div className="modal-tier-header">
                  <div className="modal-tier-icon">
                    <IconShield size={20} className="text-muted" />
                  </div>
                  <div>
                    <h2 id="upgrade-modal-title" className="text-strong" style={{ fontSize: 20 }}>Free</h2>
                    <p className="text-muted" style={{ fontSize: 14 }}>For exploration</p>
                  </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                  <span className="tabular-nums" style={{ fontSize: '3.75rem', fontWeight: 600, letterSpacing: '-0.04em' }}>$0</span>
                  <span className="text-muted"> / month</span>
                </div>

                <ul className="modal-feature-list">
                  {[
                    '10 generations per month',
                    'Full AI pipeline + auto-fix',
                    'Public gallery access',
                    'Browser WebGL2 preview & export',
                  ].map((f) => (
                    <li key={f}>
                      <span className="text-accent" style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={16} /></span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button type="button" onClick={onClose} className="modal-tier-btn modal-tier-btn-ghost">
                  {currentTier === 'free' ? 'Continue on Free' : 'Close'}
                </button>
              </div>

              <div className="modal-tier modal-tier-pro">
                <span className="modal-tier-badge">MOST POPULAR</span>

                <div className="modal-tier-header">
                  <div className="modal-tier-icon modal-tier-icon-pro">
                    <IconSpark size={20} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-strong" style={{ fontSize: 20 }}>Pro</div>
                    <p className="text-accent" style={{ fontSize: 14 }}>For serious creators</p>
                  </div>
                </div>

                <div className="row row-center" style={{ marginBottom: 32, alignItems: 'baseline' }}>
                  <span className="tabular-nums" style={{ fontSize: '3.75rem', fontWeight: 600, letterSpacing: '-0.04em' }}>$20</span>
                  <span className="text-muted" style={{ marginLeft: 4 }}>/ month</span>
                </div>

                <ul className="modal-feature-list" style={{ marginBottom: 32 }}>
                  {[
                    '200 generations per month',
                    'Best-of-N visual reranking (3× candidates)',
                    'Post-success visual polish pass',
                    'Priority model queue',
                    'Private projects + unlimited saves',
                    'Early access to new techniques',
                    'High-res video exports',
                  ].map((f) => (
                    <li key={f}>
                      <span className="text-accent" style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={16} /></span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleUpgrade('pro')}
                  className="modal-tier-btn modal-tier-btn-primary"
                  disabled={currentTier === 'pro' || currentTier === 'team'}
                >
                  <IconZap size={16} /> {currentTier === 'pro' ? 'CURRENT PLAN' : 'UPGRADE TO PRO'}
                </button>

                <p className="text-muted" style={{ textAlign: 'center', fontSize: 10, marginTop: 12 }}>
                  {billingNote}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              Team plan available for studios.{' '}
              <button type="button" className="link-inline" onClick={() => handleUpgrade('team')}>
                Contact us
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}