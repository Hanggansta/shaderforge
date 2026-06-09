import { useUser } from '@clerk/clerk-react';
import { isClerkEnabled } from '../../lib/clerk-config';
import { MyShadersPanel } from './MyShadersPanel';

export function MyShadersPanelGate({ onClose }: { onClose?: () => void }) {
  if (!isClerkEnabled()) {
    return <MyShadersPanel onClose={onClose} />;
  }

  return <MyShadersPanelClerk onClose={onClose} />;
}

function MyShadersPanelClerk({ onClose }: { onClose?: () => void }) {
  const { isSignedIn } = useUser();
  return (
    <MyShadersPanel
      onClose={onClose}
      requireSignInForCloud
      isSignedIn={isSignedIn}
    />
  );
}