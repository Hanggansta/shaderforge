import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { isClerkEnabled } from '../lib/clerk-config';
import { ClerkNavAuth } from './auth/ClerkNavAuth';
import {
  IconMenu,
  IconClose,
  IconZap,
  IconLibrary,
  IconUser,
} from './icons/ForgeIcons';

interface CyberNavProps {
  variant?: 'landing' | 'app';
  usage?: { used: number; limit: number; tier: 'free' | 'pro' | 'team' };
  onUpgrade?: () => void;
}

export function CyberNav({ variant = 'landing', usage, onUpgrade }: CyberNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isLanding = variant === 'landing';


  const navLinks = [
    { to: '/gallery', label: 'Gallery' },
    { to: '/studio', label: 'Studio' },
    { to: '/#how', label: 'How it Works' },
  ];

  const isActive = (to: string) => {
    if (to.startsWith('/#')) return false;
    return location.pathname === to;
  };

  return (
    <nav className="cyber-nav grain" aria-label="Main navigation">
      <a href="#main-content" className="skip-link">Skip to content</a>

      <div className="cyber-nav-inner">
        <Link to="/" className="cyber-nav-logo">
          <div className="cyber-nav-mark" aria-hidden="true" />
          <div>
            <div className="cyber-nav-brand">SHADERLUMEN</div>
            <div className="cyber-nav-tagline">AI • REAL-TIME • LIGHT</div>
          </div>
        </Link>

        <div className="nav-desktop">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${isActive(link.to) ? ' is-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          {usage && (
            <div className="nav-usage">
              <span className="row row-center row-gap-sm">
                <IconZap className="icon-sm" />
                <span className="tabular">{usage.used} / {usage.limit}</span>
              </span>
              <div className="nav-usage-bar" aria-hidden="true">
                <div
                  className="nav-usage-fill"
                  style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                />
              </div>
              <button type="button" onClick={onUpgrade} className="nav-upgrade-btn">
                {usage.tier === 'free' ? 'UPGRADE' : 'PRO'}
              </button>
            </div>
          )}

          {!isLanding && (
            <Link to="/" className="btn-ghost" style={{ fontSize: 12, padding: '6px 16px', borderRadius: 999 }}>
              ← Back to Site
            </Link>
          )}

          <Link to="/studio" className="btn-cyber primary" style={{ fontSize: 14, padding: '8px 24px' }}>
            Open Studio
          </Link>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-my-shaders'))}
            className="nav-chip-btn"
          >
            <IconLibrary className="icon-sm" /> My Shaders
          </button>

          {isClerkEnabled() ? (
            <ClerkNavAuth />
          ) : (
            <span className="nav-guest-pill" title="Set VITE_CLERK_PUBLISHABLE_KEY to enable sign-in">
              <IconUser size={14} />
              <span>Guest</span>
            </span>
          )}
        </div>

        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <IconClose className="icon-lg" /> : <IconMenu className="icon-lg" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="nav-mobile-menu">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="nav-link" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link to="/studio" className="btn-cyber primary" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
            Open Studio
          </Link>
        </div>
      )}
    </nav>
  );
}