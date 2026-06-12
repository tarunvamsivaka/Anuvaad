/**
 * ANUVAAD MOTION PRIMITIVES — CustomCursor.tsx
 *
 * Fluid custom cursor for the landing page experience.
 * - Follows mouse with a spring-lag effect (GSAP quickTo)
 * - Expands on hoverable elements (links, buttons, [data-cursor-expand])
 * - Contracts on clickable icons
 * - Automatically hidden on touch devices and when prefers-reduced-motion is set
 * - Restores default cursor on unmount / reduced motion
 */

'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotionContext } from './ReducedMotion';

export function CustomCursor() {
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);
  const motionSafe = useReducedMotionContext();

  useEffect(() => {
    // Don't activate on touch-only devices or when motion is reduced
    if (!motionSafe) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) return;

    // Hide the native cursor
    document.documentElement.style.cursor = 'none';

    let gsapInstance: typeof import('gsap')['default'] | null = null;
    let xDot: ReturnType<(typeof import('gsap'))['default']['quickTo']>;
    let yDot: ReturnType<(typeof import('gsap'))['default']['quickTo']>;
    let xRing: ReturnType<(typeof import('gsap'))['default']['quickTo']>;
    let yRing: ReturnType<(typeof import('gsap'))['default']['quickTo']>;

    // Lazy-load GSAP to avoid blocking initial render
    import('gsap').then(({ default: gsap }) => {
      gsapInstance = gsap;

      if (!dotRef.current || !ringRef.current) return;

      // Dot follows cursor instantly; ring lags behind (spring effect)
      xDot  = gsap.quickTo(dotRef.current,  'x', { duration: 0.1 });
      yDot  = gsap.quickTo(dotRef.current,  'y', { duration: 0.1 });
      xRing = gsap.quickTo(ringRef.current, 'x', { duration: 0.4, ease: 'power3.out' });
      yRing = gsap.quickTo(ringRef.current, 'y', { duration: 0.4, ease: 'power3.out' });
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!xDot) return;
      xDot(e.clientX);
      yDot(e.clientY);
      xRing(e.clientX);
      yRing(e.clientY);
    };

    const onMouseEnterExpandable = () => {
      if (!gsapInstance || !ringRef.current) return;
      gsapInstance.to(ringRef.current, { scale: 2.5, opacity: 0.6, duration: 0.3 });
      gsapInstance.to(dotRef.current,  { scale: 0.3, duration: 0.3 });
    };

    const onMouseLeaveExpandable = () => {
      if (!gsapInstance || !ringRef.current) return;
      gsapInstance.to(ringRef.current, { scale: 1, opacity: 1, duration: 0.3 });
      gsapInstance.to(dotRef.current,  { scale: 1, duration: 0.3 });
    };

    const onMouseDown = () => {
      if (!gsapInstance || !dotRef.current) return;
      gsapInstance.to(dotRef.current, { scale: 0.5, duration: 0.1 });
    };

    const onMouseUp = () => {
      if (!gsapInstance || !dotRef.current) return;
      gsapInstance.to(dotRef.current, { scale: 1, duration: 0.2 });
    };

    // Apply hover expansion to any interactive element
    const addHoverListeners = () => {
      const targets = document.querySelectorAll(
        'a, button, [data-cursor-expand], [role="button"]'
      );
      targets.forEach((el) => {
        el.addEventListener('mouseenter', onMouseEnterExpandable);
        el.addEventListener('mouseleave', onMouseLeaveExpandable);
      });
    };

    const removeHoverListeners = () => {
      const targets = document.querySelectorAll(
        'a, button, [data-cursor-expand], [role="button"]'
      );
      targets.forEach((el) => {
        el.removeEventListener('mouseenter', onMouseEnterExpandable);
        el.removeEventListener('mouseleave', onMouseLeaveExpandable);
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup',   onMouseUp);
    addHoverListeners();

    // Re-attach hover listeners when DOM mutates (SPA navigation)
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.documentElement.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup',   onMouseUp);
      removeHoverListeners();
      observer.disconnect();
    };
  }, [motionSafe]);

  // Don't render on server or reduced-motion preference
  if (!motionSafe) return null;

  return (
    <>
      {/* Inner dot — instant follow */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'rgb(245 158 11)', // amber-400
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
          mixBlendMode: 'difference',
        }}
      />
      {/* Outer ring — lagged spring follow */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1.5px solid rgba(245, 158, 11, 0.7)',
          pointerEvents: 'none',
          zIndex: 99998,
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
          transition: 'opacity 0.2s',
        }}
      />
    </>
  );
}

CustomCursor.displayName = 'CustomCursor';
