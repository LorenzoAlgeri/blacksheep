-- Schema Hardening: NOT NULL, UNIQUE constraints, updated_at, case-insensitive email
-- Run this in your Supabase SQL editor AFTER 20260405_gdpr_consent_columns.sql

-- 1. status must never be NULL (bypasses CHECK constraint otherwise)
ALTER TABLE subscribers ALTER COLUMN status SET NOT NULL;

-- 2. Case-insensitive unique index on email (prevents duplicate signups with different casing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email_lower
  ON subscribers (LOWER(email));

-- 3. Enforce UNIQUE constraint on token (not just an index)
ALTER TABLE subscribers ADD CONSTRAINT subscribers_token_unique UNIQUE (token);

-- 4. Add updated_at column with auto-update trigger
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscribers_updated_at ON subscribers;
CREATE TRIGGER trg_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
