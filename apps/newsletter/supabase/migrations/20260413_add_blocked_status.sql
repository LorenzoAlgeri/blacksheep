-- Add "blocked" status to subscribers CHECK constraint
-- Blocked subscribers cannot re-subscribe from the landing page

ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_status_check;
ALTER TABLE subscribers ADD CONSTRAINT subscribers_status_check
  CHECK (status IN ('pending', 'confirmed', 'unsubscribed', 'blocked'));
