/**
 * ANUVAAD MOTION PRIMITIVES — ParallaxLayer.tsx
 * Scroll-driven Y translation via GSAP ScrollTrigger.
 * Respects prefers-reduced-motion — renders static if disabled.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { registerScrollTrigger } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';

export interface ParallaxLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** How far to translate Y (px) relative to scroll. Negative = moves up on scroll. */
  speed?: number;
  /** ScrollTrigger start (default: 'top bottom') */
  start?: string;
  /** ScrollTrigger end (default: 'bottom top') */
  end?: string;
  as?: React.ElementType;
}

/**
 * ParallaxLayer — scroll-driven Y translation via ScrollTrigger
 *
 * @example
 * <ParallaxLayer speed={-60} className="absolute top-0 inset-x-0">
 *   <BackgroundOrb />
 * </ParallaxLayer>
 */
export function ParallaxLayer({
  children,
  speed = -40,
  start = 'top bottom',
  end   = 'bottom top',
  as: Component = 'div',
  className,
  ...props
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionSafe = useReducedMotionContext();

  useEffect(() => {
    if (!motionSafe || !ref.current) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap, ScrollTrigger } = await registerScrollTrigger();
      const ctx = gsap.context(() => {
        gsap.to(ref.current!, {
          y:       speed,
          ease:    'none',
          scrollTrigger: {
            trigger: ref.current,
            start,
            end,
            scrub:   true,
          },
        });
      });
      cleanup = () => { ctx.revert(); ScrollTrigger.refresh(); };
    })();

    return () => cleanup?.();
  }, [motionSafe, speed, start, end]);

  return (
    <Component ref={ref} className={className} {...props}>
      {children}
    </Component>
  );
}

ParallaxLayer.displayName = 'ParallaxLayer';
