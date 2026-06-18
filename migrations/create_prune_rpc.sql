-- ============================================================
-- Migration: Create prune_old_history RPC for O(1) history pruning
-- Date: 2026-06-17
-- Reason: BACK-07: Replace per-row DELETE loop with a single DB-side
--         subquery delete. Eliminates O(N) app-layer fetching.
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Drop if exists (idempotent)
DROP FUNCTION IF EXISTS prune_old_history(TEXT, INT);

-- Create the RPC function
CREATE OR REPLACE FUNCTION prune_old_history(p_email TEXT, p_limit INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete the oldest N rows for the given user in a single server-side operation.
  -- This avoids fetching IDs app-side and doing N individual DELETE calls.
  WITH to_delete AS (
    SELECT id
    FROM translation_history
    WHERE user_email = p_email
    ORDER BY created_at ASC
    LIMIT p_limit
  )
  DELETE FROM translation_history
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execution permission to the anon/service role used by the backend
GRANT EXECUTE ON FUNCTION prune_old_history(TEXT, INT) TO anon;
GRANT EXECUTE ON FUNCTION prune_old_history(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION prune_old_history(TEXT, INT) TO service_role;

-- Verify:
-- SELECT prune_old_history('test@example.com', 5);
