-- GDPR Consent Audit Trail: add columns for tracking consent metadata
-- Run this in your Supabase SQL editor

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS subscribed_ip text,
  ADD COLUMN IF NOT EXISTS subscribed_user_agent text,
  ADD COLUMN IF NOT EXISTS consent_version text DEFAULT '1.0';

-- Verify subscribed_at already exists (it should from initial schema)
-- If not, uncomment:
-- ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS subscribed_at timestamptz DEFAULT now();
