"use client";

import React, { useState, useEffect } from "react";

interface LiveCounterProps {
  className?: string;
  prefix?: string;
  suffix?: string;
  /** Optional seed shown before the real count loads. Defaults to 0. */
  initialValue?: number;
  style?: React.CSSProperties;
}

function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}

/**
 * Fetches the real translation count from /api/stats/translation-count
 * (server-side ISR route backed by Supabase SECURITY DEFINER RPC).
 * Falls back to a plausible static seed if the fetch fails.
 * Ticks the display counter upward every 4s to simulate live activity.
 */
export function LiveCounter({ className, prefix = "", suffix = "", initialValue, style }: LiveCounterProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);

  // Fetch real count on mount
  useEffect(() => {
    fetch("/api/stats/translation-count")
      .then((r) => r.json())
      .then(({ count }) => {
        const base = Number(count) || 0;
        setDisplayValue(base);
        setTarget(base + Math.floor(Math.random() * 10) + 3);
      })
      .catch(() => {
        // Graceful fallback — use provided seed or a plausible static number
        const seed = initialValue ?? 157;
        setDisplayValue(seed);
        setTarget(seed + 3);
      });
  }, [initialValue]);

  // Tick the counter upward every 4s to simulate live activity
  useEffect(() => {
    if (target === null || displayValue === null) return;
    const timeout = setTimeout(() => {
      setDisplayValue(target);
      setTarget((prev) => (prev ?? 0) + Math.floor(Math.random() * 8) + 2);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [target, displayValue]);

  // Smooth number animation using requestAnimationFrame
  const [rendered, setRendered] = useState<number>(0);
  useEffect(() => {
    if (displayValue === null) return;
    const start = rendered;
    const end = displayValue;
    const duration = 1800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setRendered(Math.floor(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayValue]);

  if (displayValue === null) {
    return <span className={className} style={style}>—</span>;
  }

  return (
    <span className={className} style={style}>
      {prefix}{formatNumber(rendered)}{suffix}
    </span>
  );
}
