/**
 * ANUVAAD MOTION PRIMITIVES — GlowIn.tsx
 * box-shadow 0 → var(--glow-md) on mount.
 * Used for amber-glow entrance of cards and CTAs.
 * Respects prefers-reduced-motion.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { motionConfig } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';

type GlowSize = 'xs' | 'sm' | 'md' | 'lg';

const GLOW_VALUES: Record<GlowSize, string> = {
  xs: '0 0 8px  rgba(245, 158, 11, 0.20)',
  sm: '0 0 12px rgba(245, 158, 11, 0.25)',
  md: '0 0 24px rgba(245, 158, 11, 0.35)',
  lg: '0 0 48px rgba(245, 158, 11, 0.25), 0 0 100px rgba(245, 158, 11, 0.10)',
};

export interface GlowInProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Target glow intensity */
  intensity?: GlowSize;
  /** Animation delay (seconds) */
  delay?: number;
  /** Keep glow after entrance (true = permanent, false = fades on unmount) */
  persist?: boolean;
  as?: React.ElementType;
}

/**
 * GlowIn — amber box-shadow entrance animation
 *
 * @example
 * <GlowIn intensity="md" delay={0.3}>
 *   <CTAButton />
 * </GlowIn>
 */
export function GlowIn({
  children,
  intensity = 'md',
  delay = 0,
  persist = true,
  as: Component = 'div',
  className,
  style,
  ...props
}: GlowInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionSafe = useReducedMotionContext();

  useEffect(() => {
    if (!motionSafe || !ref.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;

    (async () => {
      const { default: gsap } = await import('gsap');
      ctx = gsap.context(() => {
        gsap.from(ref.current!, {
          boxShadow: 'none',
          duration:  motionConfig.duration.slow,
          ease:      motionConfig.ease.outExpo,
          delay,
        });
      });
    })();

    return () => {
      if (!persist) ctx?.revert();
    };
  }, [motionSafe, intensity, delay, persist]);

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        boxShadow: motionSafe ? undefined : GLOW_VALUES[intensity],
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

GlowIn.displayName = 'GlowIn';
