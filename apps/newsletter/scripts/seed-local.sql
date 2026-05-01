-- ============================================================
-- BlackSheep newsletter — Local Dev Seed Data (DEV-ONLY)
-- ============================================================
--
-- Purpose: Provide a minimal, deterministic dataset for local
-- development and testing. NEVER run against production.
--
-- Order of execution (run AFTER all migrations are applied):
--   1. Apply all existing migrations under supabase/migrations/
--      including 20260501_blacksheep_list_events.sql (BlackSheep List).
--   2. Run this file:
--        psql "$DATABASE_URL" -f apps/newsletter/scripts/seed-local.sql
--      or via supabase CLI:
--        supabase db reset --debug    # applies migrations + seed automatically
--                                     # (if configured in supabase/seed.sql)
--
-- Coverage:
--   - 1 site_config row (id='main')
--   - 4 subscribers, one per status:
--       confirmed, pending, blocked, unsubscribed
--   - 2 list_events:
--       1 published (future date), 1 draft
--
-- Idempotency: all inserts use ON CONFLICT DO NOTHING so the
-- script can be re-run safely.
--
-- Anonymization convention: emails use the @example.test TLD
-- (RFC 6761 reserved for testing; no real delivery possible).
-- ============================================================


-- ------------------------------------------------------------
-- 1. site_config — required by /api/subscribe route to render
--    confirmation email tagline/venue (see src/app/api/subscribe/route.ts)
-- ------------------------------------------------------------
INSERT INTO public.site_config (id, tagline, venue)
VALUES (
  'main',
  'EVERY MONDAY',
  '11 Clubroom &middot; Corso Como &middot; Milano'
)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 2. subscribers — one row per legal status to exercise all
--    branches of the BlackSheep List registration logic
--    (see plan section C: /api/events/register).
--
-- Deterministic UUIDs (id and token) for stable test fixtures.
-- ------------------------------------------------------------
INSERT INTO public.subscribers
  (id, email, name, status, token, subscribed_ip, subscribed_user_agent, consent_version)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'confirmed@example.test',
    'Confirmed User',
    'confirmed',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '127.0.0.1',
    'seed-local',
    '1.0'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'pending@example.test',
    'Pending User',
    'pending',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '127.0.0.1',
    'seed-local',
    '1.0'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'blocked@example.test',
    'Blocked User',
    'blocked',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '127.0.0.1',
    'seed-local',
    '1.0'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'unsubscribed@example.test',
    'Unsubscribed User',
    'unsubscribed',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '127.0.0.1',
    'seed-local',
    '1.0'
  )
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 3. list_events — 1 published (future), 1 draft.
--
-- IMPORTANT: this section requires the migration
-- 20260501_blacksheep_list_events.sql to be applied first.
-- If the table does not exist yet, comment out this block.
-- ------------------------------------------------------------
INSERT INTO public.list_events
  (id, slug, title, event_date, venue, description, capacity, status, published_at, created_by)
VALUES
  (
    '55555555-5555-5555-5555-555555555555',
    'monday-club-night-may',
    'BLACK SHEEP — Monday Club Night (May)',
    (now() + interval '14 days')::timestamptz,
    '11 Clubroom — Corso Como, Milano',
    'Lista ingresso fino a mezzanotte. Dress: dark / streetwear.',
    150,
    'published',
    now(),
    'seed-local'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'monday-club-night-june',
    'BLACK SHEEP — Monday Club Night (June)',
    (now() + interval '45 days')::timestamptz,
    '11 Clubroom — Corso Como, Milano',
    NULL,
    NULL,
    'draft',
    NULL,
    'seed-local'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- End of seed-local.sql
-- ============================================================
