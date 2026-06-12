/**
 * ANUVAAD MOTION PRIMITIVES — MagneticButton.tsx
 * Mouse-proximity spring pull effect on CTA buttons.
 * Used for hero CTAs and final CTA section.
 * Disabled on touch devices and when reduced motion is set.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect, useCallback } from 'react';
import { motionConfig } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';
import { cn } from '@/lib/utils';

export interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Pull strength (0–1, default: 0.4) */
  strength?: number;
  /** Radius in px from center where magnet activates */
  radius?: number;
  as?: React.ElementType;
}

/**
 * MagneticButton — mouse-proximity spring pull for CTAs
 *
 * @example
 * <MagneticButton onClick={...} className="btn-amber-shimmer px-8 py-3 rounded-xl">
 *   Try Free →
 * </MagneticButton>
 */
export function MagneticButton({
  children,
  strength = 0.4,
  radius = 80,
  as: Component = 'button',
  className,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const motionSafe = useReducedMotionContext();

  const handleMouseMove = useCallback(async (e: Event) => {
    const me = e as MouseEvent;
    if (!ref.current) return;
    const { default: gsap } = await import('gsap');

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = me.clientX - centerX;
    const dy = me.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      gsap.to(ref.current, {
        x:        dx * strength,
        y:        dy * strength,
        duration: motionConfig.duration.fast,
        ease:     motionConfig.ease.outExpo,
      });
    }
  }, [strength, radius]);

  const handleMouseLeave = useCallback(async () => {
    if (!ref.current) return;
    const { default: gsap } = await import('gsap');
    gsap.to(ref.current, {
      x:        0,
      y:        0,
      duration: motionConfig.duration.slow,
      ease:     motionConfig.ease.spring,
    });
  }, []);

  useEffect(() => {
    // Disable on touch devices
    if (!motionSafe || !ref.current) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const el = ref.current;
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [motionSafe, handleMouseMove, handleMouseLeave]);

  return (
    <Component
      ref={ref}
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

MagneticButton.displayName = 'MagneticButton';
