/**
 * ANUVAAD MOTION PRIMITIVES — TextScramble.tsx
 * Cyberpunk character scramble reveal effect.
 * Characters cycle through random chars before settling on the final value.
 * Respects prefers-reduced-motion.
 */

'use client';

import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import { useReducedMotionContext } from './ReducedMotion';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';

export interface TextScrambleProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The final text to reveal */
  text: string;
  /** Duration of the scramble effect (ms) */
  duration?: number;
  /** Delay before starting (ms) */
  delay?: number;
  /** Number of scramble cycles per character */
  cycles?: number;
}

/**
 * TextScramble — cyberpunk character scramble reveal
 *
 * @example
 * <TextScramble text="Anuvaad" duration={800} delay={300} />
 * <TextScramble text="SYSTEM INITIALIZED" cycles={6} />
 */
export function TextScramble({
  text,
  duration = 600,
  delay = 0,
  cycles = 4,
  className,
  ...props
}: TextScrambleProps) {
  const [display, setDisplay] = useState<string>(text);
  const motionSafe = useReducedMotionContext();
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!motionSafe) {
      setDisplay(text);
      return;
    }

    const timeout = setTimeout(() => {
      startRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const revealedCount = Math.floor(progress * text.length);

        const scrambled = text
          .split('')
          .map((char, i) => {
            if (i < revealedCount) return char;
            if (char === ' ') return ' ';
            // Scramble unresolved chars for `cycles` iterations
            const cycleProgress = (elapsed / duration) * cycles;
            const frameOffset = Math.floor(cycleProgress + i) % CHARS.length;
            return CHARS[frameOffset];
          })
          .join('');

        setDisplay(scrambled);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setDisplay(text);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameRef.current);
    };
  }, [motionSafe, text, duration, delay, cycles]);

  return (
    <span
      className={className}
      aria-label={text}
      {...props}
    >
      {display}
    </span>
  );
}

TextScramble.displayName = 'TextScramble';
