-- Add gender column (nullable for legacy users; required at app-level going forward)
ALTER TABLE subscribers
  ADD COLUMN gender TEXT
  CHECK (gender IS NULL OR gender IN ('male', 'female'));

COMMENT ON COLUMN subscribers.gender IS
  'Gender self-identification: male/female. Nullable for legacy users registered before 2026-05; required at app-level for new signups since.';

-- Index for analytics queries (e.g. "donne omaggio" counts per event)
CREATE INDEX IF NOT EXISTS idx_subscribers_gender ON subscribers(gender) WHERE gender IS NOT NULL;
