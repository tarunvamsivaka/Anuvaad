-- Migration V4: Database Audit, Indexes, and RLS Hardening

-- ==========================================
-- 1. INDEXES FOR QUERY OPTIMIZATION
-- ==========================================

-- Index for dashboard stats queries (filtering by user and ordering by date)
CREATE INDEX IF NOT EXISTS idx_translation_history_user_email_created_at 
ON public.translation_history(user_email, created_at DESC);

-- Index for workspace view (filtering by workspace and ordering by date)
CREATE INDEX IF NOT EXISTS idx_translation_history_workspace_id_created_at 
ON public.translation_history(workspace_id, created_at DESC);

-- Check and skip if stripe_customer_id index is present (already exists in v1 but ensuring here)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer 
ON public.user_subscriptions(stripe_customer_id);

-- Index for API key lookups (Bring Your Own Key)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_email_active 
ON public.api_keys(user_email, is_active);

-- ==========================================
-- 2. RLS POLICIES AUDIT & HARDENING
-- ==========================================

-- translation_history: Ensure users can only insert and delete their own rows
CREATE POLICY "Users can insert their own history" 
    ON public.translation_history FOR INSERT 
    WITH CHECK (user_email = auth.jwt()->>'email');

CREATE POLICY "Users can delete their own history" 
    ON public.translation_history FOR DELETE 
    USING (user_email = auth.jwt()->>'email');

-- workspace_members: Ensure only workspace owners can insert new members
CREATE POLICY "Only owners can insert members" 
    ON public.workspace_members FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm 
            WHERE wm.workspace_id = workspace_id 
            AND wm.user_email = auth.jwt()->>'email' 
            AND wm.role = 'owner'
        )
    );

-- api_keys: Ensure only the owning user can SELECT/UPDATE/DELETE their keys
-- Drop the potential old all-encompassing policy if it exists to replace with strict ones
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can manage API keys" ON public.api_keys;

CREATE POLICY "Users can select their own API keys" 
    ON public.api_keys FOR SELECT 
    USING (user_email = auth.jwt()->>'email');

CREATE POLICY "Users can update their own API keys" 
    ON public.api_keys FOR UPDATE 
    USING (user_email = auth.jwt()->>'email')
    WITH CHECK (user_email = auth.jwt()->>'email');

CREATE POLICY "Users can delete their own API keys" 
    ON public.api_keys FOR DELETE 
    USING (user_email = auth.jwt()->>'email');

-- ==========================================
-- 3. USER TRANSLATION STATS VIEW
-- ==========================================

-- View to aggregate translation stats and avoid multiple round-trips from the frontend
CREATE OR REPLACE VIEW public.user_translation_stats AS
SELECT 
    user_email, 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE)) as this_week_count
FROM public.translation_history
GROUP BY user_email;

-- ==========================================
-- 4. CLEANUP FUNCTION & CRON JOB
-- ==========================================

-- Function to delete translation history older than 90 days for free users.
-- Pro/Enterprise users retain unlimited history.
CREATE OR REPLACE FUNCTION public.cleanup_free_user_history()
RETURNS void AS $$
BEGIN
    DELETE FROM public.translation_history th
    USING public.user_subscriptions us
    WHERE th.user_email = us.user_email
      AND us.plan = 'free'
      AND th.created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- NOTE FOR SUPABASE DASHBOARD (CRON JOB)
-- ==========================================
-- To schedule the cleanup function to run daily, enable pg_cron extension 
-- and run this in the Supabase SQL Editor:
--
-- SELECT cron.schedule(
--   'cleanup-free-history-daily',
--   '0 0 * * *', -- Runs every day at midnight
--   $$SELECT public.cleanup_free_user_history();$$
-- );
