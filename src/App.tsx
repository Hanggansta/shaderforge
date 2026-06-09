import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState, Suspense } from 'react';
import { lazyWithReload } from './utils/lazyWithReload';
import { AnimatePresence, motion } from 'framer-motion';
import { CyberNav } from './components/CyberNav';
import { AuthSync } from './components/auth/AuthSync';
import { isClerkEnabled } from './lib/clerk-config';
import { RouteFallback } from './components/RouteFallback';
import { getAnonymousUserId } from './lib/auth';
import { useProjectStore } from './store/projectStore';
import { useEditorStore } from './store/editorStore';
import { useUsageStore } from './store/usageStore';
import { useBillingConfigStore } from './store/billingConfigStore';
import { decodeShaderFromUrl } from './utils/shareUrl';
import { toast } from 'sonner';
import './App.css';

const Landing = lazyWithReload(() => import('./pages/Landing'));
const Gallery = lazyWithReload(() => import('./pages/Gallery'));
const Studio = lazyWithReload(() => import('./pages/Studio'));
const UpgradeModal = lazyWithReload(() =>
  import('./components/modals/UpgradeModal').then((m) => ({ default: m.UpgradeModal })),
);
const BillingSuccess = lazyWithReload(() => import('./pages/BillingSuccess'));

function AppShell() {
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const setCode = useEditorStore((s) => s.setCode);

  const [showUpgrade, setShowUpgrade] = useState(false);

  const generationsThisPeriod = useUsageStore((s) => s.generationsThisPeriod);
  const periodLimit = useUsageStore((s) => s.periodLimit);
  const tier = useUsageStore((s) => s.tier);
  const resetIfNeeded = useUsageStore((s) => s.resetIfNeeded);
  const syncFromAuth = useUsageStore((s) => s.syncFromAuth);

  const USAGE = {
    used: generationsThisPeriod,
    limit: periodLimit,
    tier,
  };

  const handleUpgrade = () => {
    setShowUpgrade(true);
  };

  useEffect(() => {
    void useBillingConfigStore.getState().refresh();
  }, []);

  useEffect(() => {
    if (!useUsageStore.getState().activeUserId) {
      syncFromAuth({ userId: getAnonymousUserId(), tier: 'free' });
    }
    resetIfNeeded();
    loadProjects();

    const sharedCode = decodeShaderFromUrl();
    if (sharedCode) {
      setCode(sharedCode);
      window.location.hash = '';
      toast.info('Loaded shared shader from URL');
    }

    const openUpgrade = () => setShowUpgrade(true);
    window.addEventListener('open-upgrade', openUpgrade);
    return () => window.removeEventListener('open-upgrade', openUpgrade);
  }, [loadProjects, setCode, resetIfNeeded, syncFromAuth]);

  const location = useLocation();

  return (
    <div className="app-shell">
      {isClerkEnabled() && <AuthSync />}
      <CyberNav
        variant="app"
        usage={USAGE}
        onUpgrade={handleUpgrade}
      />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Suspense fallback={<RouteFallback label="Loading landing…" />}>
                  <Landing />
                </Suspense>
              </motion.div>
            }
          />
          <Route
            path="/gallery"
            element={
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <Suspense fallback={<RouteFallback label="Loading gallery…" />}>
                  <Gallery />
                </Suspense>
              </motion.div>
            }
          />
          <Route
            path="/billing/success"
            element={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Suspense fallback={<RouteFallback label="Confirming payment…" />}>
                  <BillingSuccess />
                </Suspense>
              </motion.div>
            }
          />
          <Route path="/forge" element={<Navigate to="/studio" replace />} />
          <Route
            path="/studio"
            element={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense fallback={<RouteFallback label="Loading Studio…" />}>
                  <Studio />
                </Suspense>
              </motion.div>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Landing />
              </Suspense>
            }
          />
        </Routes>
      </AnimatePresence>

      {showUpgrade && (
        <Suspense fallback={null}>
          <UpgradeModal
            isOpen={showUpgrade}
            onClose={() => setShowUpgrade(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default AppShell;