/**
 * ANUVAAD MOTION PRIMITIVES — SlideUp.tsx
 * opacity 0→1 + y 20→0 entrance via GSAP.
 * Respects prefers-reduced-motion.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { motionConfig } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';

export interface SlideUpProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Delay before animation (seconds) */
  delay?: number;
  /** Y offset to start from (pixels, positive = below) */
  distance?: number;
  /** Duration key */
  duration?: keyof typeof motionConfig.duration;
  as?: React.ElementType;
}

/**
 * SlideUp — opacity 0→1 + y slide entrance
 *
 * @example
 * <SlideUp delay={0.1} distance={24}>
 *   <Card />
 * </SlideUp>
 */
export function SlideUp({
  children,
  delay = 0,
  distance = 20,
  duration = 'slow',
  as: Component = 'div',
  className,
  ...props
}: SlideUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionSafe = useReducedMotionContext();

  useEffect(() => {
    if (!motionSafe || !ref.current) return;

     
    let ctx: any;

    (async () => {
      const { default: gsap } = await import('gsap');
      ctx = gsap.context(() => {
        gsap.from(ref.current!, {
          opacity:  0,
          y:        distance,
          duration: motionConfig.duration[duration],
          ease:     motionConfig.ease.outExpo,
          delay,
        });
      });
    })();

    return () => ctx?.revert();
  }, [motionSafe, delay, distance, duration]);

  return (
    <Component
      ref={ref}
      className={className}
      style={motionSafe ? undefined : { opacity: 1, transform: 'none' }}
      {...props}
    >
      {children}
    </Component>
  );
}

SlideUp.displayName = 'SlideUp';
