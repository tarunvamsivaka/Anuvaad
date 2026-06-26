/**
 * ANUVAAD MOTION PRIMITIVES — RevealText.tsx
 * GSAP SplitText char/word reveal with stagger.
 * SplitText is loaded lazily to avoid blocking FCP.
 * Respects prefers-reduced-motion.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { motionConfig } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';
import { cn } from '@/lib/utils';

export interface RevealTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Split by character or word */
  by?: 'char' | 'word';
  /** Delay before reveal starts (seconds) */
  delay?: number;
  /** Duration per char/word */
  duration?: keyof typeof motionConfig.duration;
  /** Scroll-triggered (true) or mount-triggered (false) */
  scrollTrigger?: boolean;
  /** Initial Y offset */
  from?: { y?: number; rotateX?: number; filter?: string; opacity?: number };
  as?: React.ElementType;
}

/**
 * RevealText — GSAP SplitText stagger reveal
 *
 * @example
 * // Hero headline (mount-triggered):
 * <RevealText by="word" delay={0.3} from={{ y: 80, rotateX: -20 }}>
 *   Every Codebase Has a Story.
 * </RevealText>
 *
 * @example
 * // Scroll-triggered:
 * <RevealText by="char" scrollTrigger>
 *   Anuvaad reads code like a language.
 * </RevealText>
 */
export function RevealText({
  children,
  by = 'word',
  delay = 0,
  duration = 'slow',
  scrollTrigger: useScrollTrigger = false,
  from = { opacity: 0, y: 30 },
  as: Component = 'div',
  className,
  ...props
}: RevealTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionSafe = useReducedMotionContext();

  useEffect(() => {
    if (!motionSafe || !ref.current) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ default: gsap }, { SplitText }] = await Promise.all([
        import('gsap'),
        import('gsap/SplitText'),
      ]);
      gsap.registerPlugin(SplitText);

      const split = new SplitText(ref.current!, {
        type: by === 'char' ? 'chars,words' : 'words',
      });
      const targets = by === 'char' ? split.chars : split.words;

      const animConfig: gsap.TweenVars = {
        ...from,
        duration: motionConfig.duration[duration],
        ease:     motionConfig.ease.outExpo,
        stagger:  motionConfig.stagger[by === 'char' ? 'xs' : 'sm'],
        delay: useScrollTrigger ? 0 : delay,
      };

      const ctx = gsap.context(() => {
        if (useScrollTrigger) {
          gsap.from(targets, {
            ...animConfig,
            scrollTrigger: {
              trigger:  ref.current,
              start:    'top 85%',
              toggleActions: 'play none none reverse',
            },
          });
        } else {
          gsap.from(targets, animConfig);
        }
      });

      cleanup = () => {
        ctx.revert();
        split.revert();
      };
    })();

    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionSafe, by, delay, duration, useScrollTrigger]);

  return (
    <Component
      ref={ref}
      className={cn('overflow-hidden', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

RevealText.displayName = 'RevealText';
