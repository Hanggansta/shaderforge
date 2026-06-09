/** Minimal inline SVG icons — distinctive marks for key surfaces (no Lucide dependency on nav). */

import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

function IconBase({ className, size = 16, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconArrowRight({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </IconBase>
  );
}

export function IconPlay({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconMenu({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

export function IconClose({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M6 6l12 12M18 6L6 18" />
    </IconBase>
  );
}

export function IconZap({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconLibrary({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M4 6h5v14H4zM10 4h5v16h-5zM16 8h5v12h-5z" />
    </IconBase>
  );
}

export function IconUser({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </IconBase>
  );
}

export function IconSearch({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l5 5" />
    </IconBase>
  );
}

export function IconArrowLeft({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </IconBase>
  );
}

export function IconCpu({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </IconBase>
  );
}

export function IconShield({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </IconBase>
  );
}

export function IconSpark({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
    </IconBase>
  );
}

export function IconUsers({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19c0-3 2.7-5 6-5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M14 19c0-2.5 1.8-4 4-4" />
    </IconBase>
  );
}

export function IconCheck({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M5 12l4 4 10-10" />
    </IconBase>
  );
}

export function IconCloud({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M7 18h11a4 4 0 000-8 5.5 5.5 0 00-10.6-1.5A3.5 3.5 0 007 18z" />
    </IconBase>
  );
}

export function IconEye({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

export function IconTrash({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
    </IconBase>
  );
}

export function IconDisk({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}