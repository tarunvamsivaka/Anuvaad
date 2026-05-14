-- Migration v5: Onboarding State
-- Add onboarded column to user_subscriptions table to track whether a user has completed the welcome flow
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;
