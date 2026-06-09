import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/clerk-react';
import { IconUser } from '../icons/ForgeIcons';

function AuthPill({ label }: { label: string }) {
  return (
    <button type="button" className="user-pill">
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--electric-violet), var(--cool-cyan))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--void-black)',
        }}
      >
        <IconUser size={14} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--soft-white)' }}>{label}</span>
    </button>
  );
}

/** Nav auth controls — uses @clerk/clerk-react (Vite SPA, not @clerk/nextjs). */
export function ClerkNavAuth() {
  return (
    <div className="row row-center row-gap-sm">
      <SignedOut>
        <SignInButton mode="modal">
          <AuthPill label="Sign in" />
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
            Sign up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}