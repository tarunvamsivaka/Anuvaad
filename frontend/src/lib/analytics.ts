/**
 * PostHog Analytics — Privacy-safe event tracking for Anuvaad.
 *
 * IMPORTANT: Never include actual code content in any event property.
 * Only metadata (language, char count, mode, etc.) is tracked.
 */

import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = "https://eu.i.posthog.com"; // EU data residency

let _initialised = false;

/**
 * Initialise PostHog client-side. Safe to call multiple times;
 * subsequent calls are no-ops.
 */
export function initPostHog() {
  if (_initialised || typeof window === "undefined" || !POSTHOG_KEY) return;

  const hasConsent = localStorage.getItem("analytics_consent") === "true";

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Respect user privacy — autocapture only if consent is true
    autocapture: hasConsent,
    capture_pageview: hasConsent,
    capture_pageleave: hasConsent,
    opt_out_capturing_by_default: !hasConsent,
    // Disable session recording by default (enable via PostHog dashboard)
    disable_session_recording: true,
    // Don't send PII in autocaptured events
    sanitize_properties: (properties) => {
      // Strip any property that could accidentally contain code
      const blocked = ["raw_code", "code", "prompt", "input_text", "source_code"];
      for (const key of blocked) {
        if (key in properties) {
          delete properties[key];
        }
      }
      return properties;
    },
    loaded: (ph) => {
      // Opt out of tracking in development unless explicitly enabled
      if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_POSTHOG_DEBUG) {
        ph.opt_out_capturing();
      }
      // If consent is not explicitly true, ensure capturing is disabled
      if (localStorage.getItem("analytics_consent") !== "true") {
        ph.opt_out_capturing();
      }
    },
  });

  _initialised = true;
}

/**
 * Opt-in user to PostHog analytics and start capturing.
 */
export function optInPostHog() {
  if (typeof window === "undefined") return;
  localStorage.setItem("analytics_consent", "true");
  if (!_initialised) {
    initPostHog();
  } else {
    posthog.opt_in_capturing();
  }
}

/**
 * Opt-out user from PostHog analytics and stop capturing.
 */
export function optOutPostHog() {
  if (typeof window === "undefined") return;
  localStorage.setItem("analytics_consent", "false");
  if (_initialised) {
    posthog.opt_out_capturing();
  }
}

/**
 * Track a named event with optional metadata properties.
 * Silently no-ops if PostHog is not initialised or user hasn't consented.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !_initialised) return;
  // Double check consent before capturing custom track events
  if (localStorage.getItem("analytics_consent") !== "true") return;
  posthog.capture(event, properties);
}

/**
 * Identify the current user after authentication.
 * Links all anonymous events to this user identity.
 */
export function identifyUser(email: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined" || !_initialised) return;
  if (localStorage.getItem("analytics_consent") !== "true") return;
  posthog.identify(email, traits);
}

/**
 * Reset identity on sign out so the next user gets a fresh session.
 */
export function resetIdentity() {
  if (typeof window === "undefined" || !_initialised) return;
  posthog.reset();
}

export { posthog };
