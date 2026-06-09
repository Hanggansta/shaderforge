import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ClerkProvider } from '@clerk/clerk-react'
import { RootErrorBoundary } from './components/RootErrorBoundary'
import { getClerkPublishableKey, isClerkEnabled } from './lib/clerk-config'
import './index.css'
import App from './App.tsx'

// Recover from stale chunk URLs after a production deploy.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

const appTree = (
  <BrowserRouter>
    <App />
    <Toaster position="top-center" richColors closeButton />
  </BrowserRouter>
)

const clerkKey = getClerkPublishableKey()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      {isClerkEnabled() && clerkKey ? (
        <ClerkProvider
          publishableKey={clerkKey}
          afterSignOutUrl="/"
          signInFallbackRedirectUrl="/studio"
          signUpFallbackRedirectUrl="/studio"
        >
          {appTree}
        </ClerkProvider>
      ) : (
        appTree
      )}
    </RootErrorBoundary>
  </StrictMode>,
)