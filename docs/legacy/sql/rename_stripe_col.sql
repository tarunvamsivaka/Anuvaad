-- ============================================================
-- Migration: Rename stripe_subscription_id → razorpay_subscription_id
-- Date: 2026-06-17
-- Reason: Column was misnamed at creation; Anuvaad uses Razorpay, not Stripe.
--         This rename corrects the misleading column name without changing data.
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Step 1: Rename the column
ALTER TABLE public.user_subscriptions
  RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;

-- Step 2: Drop the old index (if any was set on the old name)
DROP INDEX IF EXISTS idx_user_subscriptions_stripe_sub_id;

-- Step 3: Create a new index on the corrected column name for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_sub_id
  ON public.user_subscriptions(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

-- Step 4: Verify (this should show the new column name)
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'user_subscriptions' AND table_schema = 'public';
