import type { Variants } from 'framer-motion';

/**
 * Professional motion system for ShaderLumen SaaS.
 * Clean, purposeful, high-end creative tool aesthetic.
 * - Subtle spring for interactions
 * - Stagger for lists
 * - Smooth fades + lifts for modals/pages
 * - Professional easing (no bouncy toy animations)
 */

export const easings = {
  smooth: [0.23, 1, 0.32, 1] as const, // cubic-bezier for premium feel
  quick: [0.25, 0.1, 0.25, 1] as const,
  entrance: [0.16, 1, 0.3, 1] as const,
};

export const durations = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  page: 0.5,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: durations.base, ease: easings.smooth } 
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { 
    opacity: 1, 
    transition: { duration: durations.base, ease: easings.smooth } 
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const cardHover = {
  rest: { 
    scale: 1, 
    y: 0,
    transition: { duration: durations.fast, ease: easings.quick } 
  },
  hover: { 
    scale: 1.01, 
    y: -2,
    transition: { duration: durations.fast, ease: easings.quick } 
  },
};

export const modalVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.96, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: durations.slow, ease: easings.entrance } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.98, 
    y: 10,
    transition: { duration: durations.fast, ease: easings.quick } 
  },
};

export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: { 
    x: 0,
    transition: { duration: 0.4, ease: easings.smooth } 
  },
  exit: { 
    x: '100%',
    transition: { duration: 0.25, ease: easings.quick } 
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { duration: durations.fast, ease: easings.smooth } 
  },
};

export const progressBar: Variants = {
  initial: { width: 0 },
  animate: (width: number) => ({
    width: `${width}%`,
    transition: { duration: 0.6, ease: easings.smooth },
  }),
};

export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(0, 240, 255, 0.1)',
      '0 0 0 8px rgba(0, 240, 255, 0.0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// For AI progress steps - professional, calm, technical
export const stepVariants: Variants = {
  pending: { opacity: 0.5, scale: 0.98 },
  active: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 } 
  },
  done: { 
    opacity: 0.85, 
    scale: 1 
  },
};
