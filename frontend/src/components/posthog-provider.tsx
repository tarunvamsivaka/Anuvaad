"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, posthog } from "@/lib/analytics";

/**
 * PostHogProvider — initialises PostHog on mount and tracks
 * client-side pageviews on route changes.
 *
 * Must be rendered inside the client-side tree (after 'use client').
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise PostHog once on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Track pageviews on client-side navigation
  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname;
      const search = searchParams.toString();
      posthog.capture("$pageview", {
        $current_url: search ? `${url}?${search}` : url,
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
