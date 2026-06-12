/**
 * ANUVAAD MOTION PRIMITIVES — CountUp.tsx
 * Animated number counter that counts to a target value on mount.
 * Uses GSAP's object tweening — no DOM manipulation.
 * Respects prefers-reduced-motion.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import { motionConfig } from '@/lib/motion';
import { useReducedMotionContext } from './ReducedMotion';

export interface CountUpProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Target value to count up to */
  to: number;
  /** Starting value */
  from?: number;
  /** Duration in seconds */
  duration?: number;
  /** Decimal places */
  decimals?: number;
  /** Prefix before number (e.g. "$") */
  prefix?: string;
  /** Suffix after number (e.g. "k+", "%") */
  suffix?: string;
  /** Delay before counting starts */
  delay?: number;
  /** Number formatter — override for locales */
  format?: (value: number) => string;
}

/**
 * CountUp — animated number counter
 *
 * @example
 * <CountUp to={12500} suffix="+" prefix="$" duration={1.2} />
 * <CountUp to={94.7} decimals={1} suffix="%" />
 */
export function CountUp({
  to,
  from = 0,
  duration = motionConfig.duration.cinematic,
  decimals = 0,
  prefix = '',
  suffix = '',
  delay = 0,
  format,
  className,
  ...props
}: CountUpProps) {
  const [display, setDisplay] = useState<string>(
    format ? format(from) : from.toFixed(decimals)
  );
  const motionSafe = useReducedMotionContext();
  const tweenRef = useRef<{ value: number }>({ value: from });

  useEffect(() => {
    if (!motionSafe) {
      setDisplay(format ? format(to) : to.toFixed(decimals));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;

    (async () => {
      const { default: gsap } = await import('gsap');
      tweenRef.current.value = from;

      ctx = gsap.context(() => {
        gsap.to(tweenRef.current, {
          value:    to,
          duration,
          delay,
          ease:     motionConfig.ease.outExpo,
          onUpdate: () => {
            setDisplay(
              format
                ? format(tweenRef.current.value)
                : tweenRef.current.value.toFixed(decimals)
            );
          },
          onComplete: () => {
            setDisplay(format ? format(to) : to.toFixed(decimals));
          },
        });
      });
    })();

    return () => ctx?.revert();
  }, [motionSafe, to, from, duration, delay, decimals, format]);

  return (
    <span
      className={className}
      aria-live="polite"
      aria-label={`${prefix}${to.toFixed(decimals)}${suffix}`}
      {...props}
    >
      {prefix}{display}{suffix}
    </span>
  );
}

CountUp.displayName = 'CountUp';
