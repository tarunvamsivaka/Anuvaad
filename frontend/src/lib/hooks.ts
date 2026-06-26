/**
 * @/lib/hooks — re-exports from the canonical location.
 * Source of truth: @/hooks/index
 * This barrel exists so existing @/lib/hooks imports continue to work.
 */
export type { TranslationHistoryItem } from "@/hooks/index";
export { useTranslationStats, useSubscriptionStatus, useCredits } from "@/hooks/index";
