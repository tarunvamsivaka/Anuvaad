"use client";

import { useEffect } from "react";

/**
 * EdgeWarmup
 *
 * Pre-warms the backend API edge instance upon initial client mount using
 * a zero-overhead HTTP HEAD request to /api/v1/health.
 *
 * This eliminates cold starts for off-peak and international users
 * without requiring 24/7 continuous cron pings, preserving Render free-tier compute hours.
 */
export function EdgeWarmup() {
  useEffect(() => {
    // Only execute in the browser
    if (typeof window === "undefined") return;

    // Use idle callback if available, else slight delay so critical render finishes first
    const schedule =
      window.requestIdleCallback ||
      ((cb: () => void) => setTimeout(cb, 300));

    schedule(() => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
        fetch(`${apiBase}/api/v1/health`, {
          method: "HEAD",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
        }).catch(() => {
          // Silent swallow — non-critical edge pre-warm
        });
      } catch {
        // Safe fallback
      }
    });
  }, []);

  return null;
}
