/**
 * ANUVAAD MOTION PRIMITIVES — FadeIn.tsx
 * opacity 0 → 1 on mount via GSAP.
 * Respects prefers-reduced-motion via useReducedMotionContext().
 */

'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { motionConfig, isMotionSafe } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';

export interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Duration in seconds */
  duration?: keyof typeof motionConfig.duration;
  /** Easing key from motionConfig */
  ease?: keyof typeof motionConfig.ease;
  /** Initial opacity (default: 0) */
  from?: number;
  as?: React.ElementType;
}

/**
 * FadeIn — opacity 0 → 1 entrance animation
 *
 * @example
 * <FadeIn delay={0.2} duration="slow">
 *   <HeroContent />
 * </FadeIn>
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 'normal',
  ease = 'outExpo',
  from = 0,
  as: Component = 'div',
  className,
  ...props
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionSafe = useReducedMotionContext();

  useEffect(() => {
    if (!motionSafe || !ref.current) return;

     
    let ctx: any;

    (async () => {
      const { default: gsap } = await import('gsap');
      ctx = gsap.context(() => {
        gsap.from(ref.current!, {
          opacity:  from,
          duration: motionConfig.duration[duration],
          ease:     motionConfig.ease[ease],
          delay,
        });
      });
    })();

    return () => ctx?.revert();
  }, [motionSafe, delay, duration, ease, from]);

  return (
    <Component
      ref={ref}
      className={className}
      style={motionSafe ? undefined : { opacity: 1 }}
      {...props}
    >
      {children}
    </Component>
  );
}

FadeIn.displayName = 'FadeIn';
