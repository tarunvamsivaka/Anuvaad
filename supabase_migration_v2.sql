-- Anuvaad v2 Enterprise Upgrade Migration

-- 1. Create translation history table
CREATE TABLE IF NOT EXISTS public.translation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    source_language TEXT,
    target_language TEXT,
    mode TEXT NOT NULL,
    character_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Secure it with RLS
ALTER TABLE public.translation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history" 
    ON public.translation_history FOR SELECT 
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE email = user_email
    ));

-- The FastAPI backend uses the SERVICE_ROLE key to insert records, so it bypasses RLS.

-- 2. Create API Keys table for Developers
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    api_key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys" 
    ON public.api_keys FOR ALL 
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE email = user_email
    ));
