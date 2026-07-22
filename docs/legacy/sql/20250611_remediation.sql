-- ============================================================
-- Migration: Phase 1 Remediation (BACK-10, Phase 6.6)
-- Run in Supabase SQL Editor
-- ============================================================

-- BACK-10: Rename stripe_subscription_id column to razorpay_subscription_id
-- This aligns the DB schema with the actual payment provider (Razorpay).
-- The old column name (stripe_subscription_id) was a naming artifact from
-- an early design using Stripe; the app exclusively uses Razorpay.
DO $$
BEGIN
    -- Only rename if the old column exists and the new one doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_subscriptions'
          AND column_name = 'stripe_subscription_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_subscriptions'
          AND column_name = 'razorpay_subscription_id'
    ) THEN
        ALTER TABLE public.user_subscriptions
        RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;

        RAISE NOTICE 'Column stripe_subscription_id renamed to razorpay_subscription_id';
    ELSE
        RAISE NOTICE 'Column rename skipped: either already renamed or old column missing';
    END IF;
END $$;

-- Phase 6.6: Composite index for daily quota queries (P5)
-- The enforce_quotas_and_protection() function queries:
--   translation_history WHERE user_email=? AND created_at >= today_start
-- A composite index on (user_email, created_at DESC) satisfies both
-- the equality filter and the range scan with a single index seek.
CREATE INDEX IF NOT EXISTS idx_translation_history_quota
    ON public.translation_history (user_email, created_at DESC);

-- Index for history pruning (O(N) → O(log N)):
-- Used by save_translation_background() to count + prune old records.
CREATE INDEX IF NOT EXISTS idx_translation_history_user_created
    ON public.translation_history (user_email, created_at ASC);

-- Index for workspace filtering
CREATE INDEX IF NOT EXISTS idx_translation_history_workspace
    ON public.translation_history (workspace_id, created_at DESC)
    WHERE workspace_id IS NOT NULL;
