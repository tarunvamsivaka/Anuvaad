"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseScrollRevealOptions {
  /** Fraction of element visible before triggering (0–1). Default 0.15 */
  threshold?: number;
  /** Once triggered, never unobserve. Default true */
  once?: boolean;
  /** Extra margin around root viewport. Default "0px 0px -60px 0px" */
  rootMargin?: string;
}

/**
 * Attaches an IntersectionObserver to `ref` and returns `isVisible`.
 * When `once=true` (default) the element stays visible after first intersection.
 *
 * Usage:
 *   const [ref, isVisible] = useScrollReveal<HTMLDivElement>();
 *   <div ref={ref} className={isVisible ? "opacity-100" : "opacity-0"} />
 */
export function useScrollReveal<T extends Element = HTMLElement>(
  options: UseScrollRevealOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0.15, once = true, rootMargin = "0px 0px -60px 0px" } =
    options;

  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip when user prefers reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return [ref, isVisible];
}

/**
 * Animates a number from 0 to `target` over `duration` ms,
 * starting only when `trigger` becomes true.
 *
 * Usage:
 *   const count = useCountUp(1247, isVisible);
 *   <span>{count}</span>
 */
export function useCountUp(
  target: number,
  trigger: boolean,
  duration = 1200
): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;

    // Skip animation if reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setValue(target);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, trigger, duration]);

  return value;
}
