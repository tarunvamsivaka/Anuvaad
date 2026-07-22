-- =============================================================================
-- Anuvaad DB Indexes Migration
-- Phase 5 / Performance Audit Recommendation #3
-- =============================================================================

-- HOT PATH 1: Translation history paginated by user + date
CREATE INDEX IF NOT EXISTS idx_th_user_created
    ON translation_history(user_email, created_at DESC);

-- HOT PATH 2: Workspace-scoped history queries
CREATE INDEX IF NOT EXISTS idx_th_user_workspace
    ON translation_history(user_email, workspace_id, created_at DESC);

-- HOT PATH 3: Public share lookup
CREATE INDEX IF NOT EXISTS idx_th_public
    ON translation_history(id) WHERE is_public = TRUE;

-- HOT PATH 4: Subscription lookup (called on every authenticated request)
CREATE INDEX IF NOT EXISTS idx_us_email
    ON user_subscriptions(user_email);

-- HOT PATH 5: API key lookup by hash
CREATE INDEX IF NOT EXISTS idx_ak_hash
    ON api_keys(api_key_hash);

-- =============================================================================
-- Supabase RPC: Atomic credit deduction (BUG#1+#5 definitive fix)
-- Returns new credit balance, or NULL if credits were already 0.
-- =============================================================================
CREATE OR REPLACE FUNCTION deduct_one_credit(p_email TEXT)
RETURNS INTEGER
LANGUAGE sql
AS $$
    UPDATE user_subscriptions
    SET credits = credits - 1
    WHERE user_email = p_email
      AND credits > 0
    RETURNING credits;
$$;

GRANT EXECUTE ON FUNCTION deduct_one_credit(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_one_credit(TEXT) TO service_role;
