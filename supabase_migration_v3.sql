-- Migration V3: Team Workspaces (B2B SaaS)

-- 1. Create Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. Create Workspace Members Table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, user_email)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Workspaces and Members
-- Users can view workspaces they are a member of
CREATE POLICY "Users can view their workspaces" 
    ON public.workspaces FOR SELECT 
    USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Users can view members of workspaces they are a part of
CREATE POLICY "Users can view their team members" 
    ON public.workspace_members FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- 4. Update translation_history and api_keys
-- Since users might have old personal history without a workspace, we allow workspace_id to be NULL.
ALTER TABLE public.translation_history 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 5. Update RLS Policies for History
-- Drop old policy
DROP POLICY IF EXISTS "Users can view their own history" ON public.translation_history;

-- New Policy: Users can see history if it belongs to their workspace OR if it's their personal history (workspace_id IS NULL and user_email matches)
CREATE POLICY "Users can view history" 
    ON public.translation_history FOR SELECT 
    USING (
        (workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
        ))
        OR 
        (workspace_id IS NULL AND auth.uid() IN (SELECT id FROM auth.users WHERE email = user_email))
    );

-- 6. Update RLS Policies for API Keys
-- Drop old policy
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;

-- New Policy: Users can manage API keys for their workspace OR personal keys
CREATE POLICY "Users can manage API keys" 
    ON public.api_keys FOR ALL 
    USING (
        (workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
        ))
        OR 
        (workspace_id IS NULL AND auth.uid() IN (SELECT id FROM auth.users WHERE email = user_email))
    );
