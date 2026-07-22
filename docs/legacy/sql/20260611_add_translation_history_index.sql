-- migrations/20260611_add_translation_history_index.sql
-- P5: Add composite index to speed up quota queries (get_today_usage_count)
-- Previously a full table scan; now an index range scan by user + date.
-- SAFE: CREATE INDEX IF NOT EXISTS is non-destructive and auto-skipped if exists.

CREATE INDEX IF NOT EXISTS idx_translation_history_user_date
  ON translation_history (user_email, created_at DESC);

-- This index covers the most common query pattern:
--   SELECT COUNT(*) FROM translation_history
--   WHERE user_email = $1 AND created_at >= $2
-- Estimated speedup: 10-100x for users with large histories.
