-- Database Migration Script for Repository Memory and Session Continuity
-- Run this in your Supabase SQL Editor

ALTER TABLE public.translation_history
ADD COLUMN session_id TEXT,
ADD COLUMN repository_name TEXT,
ADD COLUMN file_path TEXT;

-- Optional: Create an index for faster querying by session_id
CREATE INDEX idx_translation_history_session_id ON public.translation_history(session_id);

CREATE TABLE IF NOT EXISTS public.user_github_tokens (
    user_email TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
