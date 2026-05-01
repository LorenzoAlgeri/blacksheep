-- Follow-up tracking columns for pending subscribers
-- Supports max attempts and cadence checks

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS follow_up_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follow_up_last_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscribers_follow_up_pending
  ON subscribers (status, follow_up_count, follow_up_last_sent_at);