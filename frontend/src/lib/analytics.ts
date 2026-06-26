/**
 * @/lib/analytics — re-exports from the canonical location.
 * Source of truth: @/infrastructure/analytics
 * This barrel exists so existing @/lib/analytics imports continue to work.
 */
export {
  initPostHog,
  optInPostHog,
  optOutPostHog,
  track,
  identifyUser,
  resetIdentity,
  posthog,
} from "@/infrastructure/analytics";
