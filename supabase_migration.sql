-- Anuvaad — Supabase User Subscriptions Table
-- Run this SQL in your Supabase Dashboard → SQL Editor
--
-- This table tracks Stripe subscription status per user.
-- The Stripe webhook endpoint updates it automatically.

-- 1. Create the subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'unpaid')),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.jwt() ->> 'email' = user_email);

-- Service role (backend) can do everything
-- (The backend uses the service role key, not the anon key)

-- 4. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_email ON user_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);

-- 5. Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 6. Create a function the frontend can call to check Pro status
CREATE OR REPLACE FUNCTION is_pro_user(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_subscriptions
        WHERE user_email = check_email
        AND plan IN ('pro', 'enterprise')
        AND status IN ('active', 'trialing')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
