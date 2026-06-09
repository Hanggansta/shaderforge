import { isClerkEnabled } from '../../lib/clerk-config';
import { UpgradeModalClerk } from './UpgradeModalClerk';
import { UpgradeModalView } from './UpgradeModalView';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  if (isClerkEnabled()) {
    return <UpgradeModalClerk isOpen={isOpen} onClose={onClose} />;
  }

  return (
    <UpgradeModalView
      isOpen={isOpen}
      onClose={onClose}
      isSignedIn={false}
    />
  );
}