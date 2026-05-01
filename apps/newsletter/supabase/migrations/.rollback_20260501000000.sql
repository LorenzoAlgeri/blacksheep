-- ============================================================
-- ROLLBACK DOCUMENTALE — NON eseguito automaticamente.
-- Esegui manualmente solo se necessario rollback della migration
-- 20260501000000_blacksheep_list_events.sql.
-- ============================================================
--
-- The leading dot in the filename ('.rollback_...') keeps the
-- Supabase CLI migration runner from picking this up: only files
-- matching `<timestamp>_<name>.sql` are applied.
--
-- Drop order is the reverse of FK creation:
--   1. list_event_registrations (FK → list_events, FK → subscribers)
--   2. list_events
--   3. contact_help_requests
--
-- The shared trigger function update_updated_at_column() is owned
-- by 20260405000100_schema_hardening.sql and MUST NOT be dropped here.
-- ============================================================

-- 1. Drop the registration table first (it FKs into list_events).
--    Dropping the table also drops its indexes and any per-table
--    triggers. We did not attach any trigger to this table.
DROP TABLE IF EXISTS public.list_event_registrations;

-- 2. Drop list_events. This implicitly drops:
--    - trg_list_events_updated_at trigger
--    - list_events_status_event_date_idx
--    - list_events_event_date_idx
DROP TABLE IF EXISTS public.list_events;

-- 3. Drop the standalone audit table (no FKs; safe last).
DROP TABLE IF EXISTS public.contact_help_requests;

-- Verify after rollback:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' AND table_name IN
--   ('list_events','list_event_registrations','contact_help_requests');
-- (expected: zero rows)

-- ============================================================
-- End of .rollback_20260501000000.sql
-- ============================================================
