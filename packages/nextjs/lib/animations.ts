/**
 * Framer Motion Animation Configuration
 * Shared animation presets for the CredBureau UI.
 */

export const springConfig = {
  type: "spring" as const,
  stiffness: 260,
  damping: 20,
};

export const gentleSpring = {
  type: "spring" as const,
  stiffness: 120,
  damping: 14,
};

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5 },
};

export const slideInFromLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

export const slideInFromBottom = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: springConfig,
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Score gauge animation
export const gaugeAnimation = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: {
    duration: 1.5,
    ease: "easeOut" as const,
  },
};

// Counter animation config
export const counterSpring = {
  type: "spring" as const,
  stiffness: 50,
  damping: 15,
};
