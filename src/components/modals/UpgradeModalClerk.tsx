import { useUser, SignInButton } from '@clerk/clerk-react';
import { UpgradeModalView } from './UpgradeModalView';

interface UpgradeModalClerkProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModalClerk({ isOpen, onClose }: UpgradeModalClerkProps) {
  const { isSignedIn, user } = useUser();

  return (
    <UpgradeModalView
      isOpen={isOpen}
      onClose={onClose}
      isSignedIn={isSignedIn === true}
      clerkUserId={user?.id}
      signInSlot={(
        <SignInButton mode="modal">
          <button type="button" className="btn-cyber primary" style={{ fontSize: 12, padding: '6px 14px' }}>
            Sign in
          </button>
        </SignInButton>
      )}
    />
  );
}