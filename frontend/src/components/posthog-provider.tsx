"use client";

import { useEffect, Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, posthog, optInPostHog, optOutPostHog } from "@/lib/analytics";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  return null;
}

function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if consent has already been given or declined
    const consent = localStorage.getItem("analytics_consent");
    if (consent === null) {
      // Small timeout to feel natural and not block initial page paint
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    optInPostHog();
    setShow(false);
  };

  const handleDecline = () => {
    optOutPostHog();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">We respect your privacy</h4>
            <button onClick={handleDecline} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            We use anonymous product analytics cookies to improve our code translations. Read our{" "}
            <a href="/privacy" className="underline hover:text-amber-600">
              Privacy Policy
            </a>
            .
          </p>
          <div className="mt-3.5 flex items-center justify-end gap-2 text-xs">
            <Button variant="ghost" size="sm" onClick={handleDecline} className="h-8 px-3 text-xs">
              Decline
            </Button>
            <Button size="sm" onClick={handleAccept} className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium">
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PostHogProvider — initialises PostHog on mount and tracks
 * client-side pageviews on route changes.
 *
 * Must be rendered inside the client-side tree (after 'use client').
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Initialise PostHog once on mount
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogTracker />
      </Suspense>
      {children}
      <ConsentBanner />
    </>
  );
}
