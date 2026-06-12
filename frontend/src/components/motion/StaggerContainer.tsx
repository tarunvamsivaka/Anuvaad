/**
 * ANUVAAD MOTION PRIMITIVES — StaggerContainer.tsx
 * GSAP stagger scope: animates direct children with stagger timing.
 * Respects prefers-reduced-motion.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { motionConfig, buildStagger } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';

export interface StaggerContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stagger step size */
  stagger?: keyof typeof motionConfig.stagger;
  /** GSAP from-direction: 'start' | 'end' | 'center' | 'edges' | number */
  from?: 'start' | 'end' | 'center' | 'edges' | number;
  /** Initial y offset for children */
  distance?: number;
  /** Delay before first child animates */
  delay?: number;
  /** CSS selector for children to stagger (default: ':scope > *') */
  childSelector?: string;
  as?: React.ElementType;
}

/**
 * StaggerContainer — wraps children with GSAP stagger entrance
 *
 * @example
 * <StaggerContainer stagger="sm" from="start">
 *   <StatCard />
 *   <StatCard />
 *   <StatCard />
 * </StaggerContainer>
 */
export function StaggerContainer({
  children,
  stagger = 'sm',
  from = 'start',
  distance = 16,
  delay = 0,
  childSelector = ':scope > *',
  as: Component = 'div',
  className,
  ...props
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionSafe = useReducedMotionContext();

  useEffect(() => {
    if (!motionSafe || !ref.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;

    (async () => {
      const { default: gsap } = await import('gsap');
      const children = ref.current!.querySelectorAll(childSelector);
      if (!children.length) return;

      ctx = gsap.context(() => {
        gsap.from(children, {
          opacity:  0,
          y:        distance,
          duration: motionConfig.duration.slow,
          ease:     motionConfig.ease.outExpo,
          delay,
          stagger:  buildStagger(stagger, { from }),
        });
      });
    })();

    return () => ctx?.revert();
  }, [motionSafe, stagger, from, distance, delay, childSelector]);

  return (
    <Component
      ref={ref}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

StaggerContainer.displayName = 'StaggerContainer';
