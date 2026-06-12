/**
 * ANUVAAD MOTION PRIMITIVES — PageTransition.tsx
 * GSAP clip-path wipe on App Router route change.
 * Covers the seam between pages with an amber-black overlay.
 * Respects prefers-reduced-motion.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motionConfig } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';

export interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition — GSAP clip-path wipe overlay on route change.
 * Mount inside a root layout (not inside a page).
 *
 * @example
 * // app/layout.tsx:
 * <PageTransition>
 *   {children}
 * </PageTransition>
 */
export function PageTransition({ children }: PageTransitionProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname   = usePathname();
  const motionSafe = useReducedMotionContext();
  const isFirstRender = useRef(true);

  const runTransition = useCallback(async () => {
    if (!motionSafe || !overlayRef.current) return;

    const { default: gsap } = await import('gsap');
    const overlay = overlayRef.current;

    gsap.timeline()
      .set(overlay, { clipPath: 'inset(0 100% 0 0)', display: 'block' })
      .to(overlay,  {
        clipPath:  'inset(0 0% 0 0)',
        duration:  motionConfig.duration.normal,
        ease:      motionConfig.ease.sharp,
      })
      .to(overlay, {
        clipPath:  'inset(0 0 0 100%)',
        duration:  motionConfig.duration.fast,
        ease:      motionConfig.ease.sharp,
        delay:     0.05,
      })
      .set(overlay, { display: 'none' });
  }, [motionSafe]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    runTransition();
  }, [pathname, runTransition]);

  return (
    <>
      {children}
      {/* Wipe overlay — pointer-events: none so it doesn't block clicks */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'var(--z-modal)' as unknown as number,
          background: '#030014',
          display: 'none',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

PageTransition.displayName = 'PageTransition';
