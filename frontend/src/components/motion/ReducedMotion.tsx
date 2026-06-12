/**
 * ANUVAAD MOTION PRIMITIVES — ReducedMotion.tsx
 * Tree-level opt-out of all animations.
 * Wraps children; when prefers-reduced-motion: reduce is active,
 * all descendant GSAP animations are skipped via context.
 */

'use client';

import * as React from 'react';
import { useMotionSafe } from '@/lib/motion';

export interface ReducedMotionProps {
  children: React.ReactNode;
  /** Fallback render when motion is disabled */
  fallback?: React.ReactNode;
}

/**
 * ReducedMotion — context provider for motion opt-out
 *
 * Children can consume `useReducedMotionContext()` to know if
 * motion is enabled. All motion primitives read this context.
 *
 * @example
 * <ReducedMotion>
 *   <FadeIn>...</FadeIn>   // will skip animation if reduced motion
 *   <SlideUp>...</SlideUp>
 * </ReducedMotion>
 */

const ReducedMotionContext = React.createContext<boolean>(true);

export function useReducedMotionContext(): boolean {
  return React.useContext(ReducedMotionContext);
}

export function ReducedMotion({ children, fallback }: ReducedMotionProps) {
  const [motionSafe, setMotionSafe] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: no-preference)');
    setMotionSafe(mq.matches);

    const handler = (e: MediaQueryListEvent) => setMotionSafe(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // When motion is disabled, render fallback if provided
  if (!motionSafe && fallback !== undefined) {
    return (
      <ReducedMotionContext.Provider value={false}>
        {fallback}
      </ReducedMotionContext.Provider>
    );
  }

  return (
    <ReducedMotionContext.Provider value={motionSafe}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

ReducedMotion.displayName = 'ReducedMotion';
