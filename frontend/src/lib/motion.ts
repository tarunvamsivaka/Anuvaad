/**
 * ANUVAAD MOTION SYSTEM — lib/motion.ts
 * Phase E1.4: GSAP-Only Motion Engine
 *
 * Single source of truth for all animation configuration.
 * All GSAP calls in the codebase reference these values — no magic numbers.
 *
 * Architecture decisions:
 * - GSAP is the single animation engine (Framer Motion removed)
 * - motionConfig maps 1:1 to CSS animation tokens in animation.css
 * - useMotionSafe() gates all GSAP registrations
 * - useGsapContext() provides safe cleanup in React effects
 */

import { useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';

// ---------------------------------------------------------------------------
// Motion Configuration
// ---------------------------------------------------------------------------

/**
 * Canonical motion config — mirrors CSS animation tokens.
 * Use these values in all gsap.to() / gsap.from() calls.
 */
export const motionConfig = {
  ease: {
    /** Smooth expo deceleration — most entrances */
    outExpo:  'power4.out',
    /** Slight overshoot — buttons, cards */
    spring:   'back.out(1.4)',
    /** Symmetric — state transitions */
    inOut:    'power2.inOut',
    /** Sharp emphasis — wipes, page transitions */
    sharp:    'power3.inOut',
    /** Default ease */
    out:      'power2.out',
  },
  duration: {
    instant:   0.05,
    fast:      0.15,
    normal:    0.30,
    slow:      0.50,
    slower:    0.80,
    cinematic: 1.20,
  },
  stagger: {
    xs: 0.04,
    sm: 0.06,
    md: 0.10,
    lg: 0.16,
  },
} as const;

export type MotionEase     = keyof typeof motionConfig.ease;
export type MotionDuration = keyof typeof motionConfig.duration;

// ---------------------------------------------------------------------------
// Reduced Motion Hook
// ---------------------------------------------------------------------------

/**
 * Returns `true` when animations are safe to run.
 * Returns `false` when the user has enabled prefers-reduced-motion.
 *
 * Usage:
 * ```tsx
 * const safe = useMotionSafe();
 * useEffect(() => {
 *   if (!safe) return;
 *   gsap.from(ref.current, { opacity: 0, y: 20 });
 * }, [safe]);
 * ```
 */
export function useMotionSafe(): boolean {
  const mediaQuery =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: no-preference)')
      : null;
  return mediaQuery?.matches ?? false;
}

/**
 * SSR-safe check — use in non-hook contexts (workers, server utilities).
 */
export function isMotionSafe(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

// ---------------------------------------------------------------------------
// GSAP Context Hook
// ---------------------------------------------------------------------------

/**
 * Creates a GSAP context scoped to a ref element.
 * Automatically reverts all animations on component unmount.
 *
 * Usage:
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { context } = useGsapContext(containerRef);
 *
 * useEffect(() => {
 *   if (!isMotionSafe()) return;
 *   context.add(() => {
 *     gsap.from('.item', { opacity: 0, stagger: motionConfig.stagger.sm });
 *   });
 *   return () => context.revert();
 * }, [context]);
 * ```
 */
export function useGsapContext(ref: RefObject<Element | null>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contextRef = useRef<any>(null);

  const getContext = useCallback(async () => {
    const { gsap } = await import('gsap');
    if (!contextRef.current) {
      contextRef.current = gsap.context(() => {}, ref.current ?? undefined);
    }
    return contextRef.current;
  }, [ref]);

  useEffect(() => {
    return () => {
      contextRef.current?.revert();
    };
  }, []);

  return { getContext };
}

// ---------------------------------------------------------------------------
// ScrollTrigger Registration Helper
// ---------------------------------------------------------------------------

/**
 * Lazy-registers GSAP ScrollTrigger plugin.
 * Safe to call multiple times — GSAP deduplicates.
 *
 * Usage:
 * ```tsx
 * useEffect(() => {
 *   registerScrollTrigger().then(({ gsap, ScrollTrigger }) => {
 *     ScrollTrigger.create({ ... });
 *   });
 * }, []);
 * ```
 */
export async function registerScrollTrigger() {
  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

/**
 * Lazy-registers GSAP FLIP plugin.
 */
export async function registerFlip() {
  const [{ default: gsap }, { Flip }] = await Promise.all([
    import('gsap'),
    import('gsap/Flip'),
  ]);
  gsap.registerPlugin(Flip);
  return { gsap, Flip };
}

// ---------------------------------------------------------------------------
// Utility: Build GSAP stagger config
// ---------------------------------------------------------------------------

/**
 * Returns a GSAP stagger configuration object from the motion config.
 *
 * @param size - stagger step size key
 * @param options - additional GSAP stagger options
 */
export function buildStagger(
  size: keyof typeof motionConfig.stagger = 'sm',
  options: Record<string, unknown> = {}
) {
  return {
    each: motionConfig.stagger[size],
    ...options,
  };
}
