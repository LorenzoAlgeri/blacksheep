-- ============================================================
-- 00000000_initial_schema.sql — RETROSPECTIVE BOOTSTRAP
-- ============================================================
--
-- The tables below were originally created via the Supabase
-- Studio UI before the project adopted file-based migrations.
-- This bootstrap re-creates that pre-ALTER state so that
-- `supabase db reset` on a fresh local DB can replay the entire
-- migration history end-to-end without manual setup.
--
-- WHAT THIS FILE INTENTIONALLY DOES NOT DO:
--   - No `subscribed_ip`, `subscribed_user_agent`, `consent_version`
--     → added by 20260405_gdpr_consent_columns.sql
--   - No `updated_at` column on subscribers; no trigger function
--     `update_updated_at_column()`; no UNIQUE LOWER(email) index;
--     no UNIQUE constraint on token; no SET NOT NULL on status
--     → added by 20260405_schema_hardening.sql
--   - No `'blocked'` value in the status CHECK
--     → added by 20260413_add_blocked_status.sql
--   - No ENABLE ROW LEVEL SECURITY
--     → added by 20260416_enable_rls.sql
--   - No `follow_up_count`, `follow_up_last_sent_at`
--     → added by 20260420_follow_up_tracking.sql
--
-- All operations are idempotent (`IF NOT EXISTS`) so re-running
-- the migration chain (e.g. on `supabase db reset` retries) is
-- safe.
--
-- ⚠️ This file is best-effort reconstructed from production
-- behaviour and the existing ALTERs. Production stays the source
-- of truth; if a column/constraint diverges, prefer prod and
-- patch this bootstrap.
--
-- Schema validato contro CREATE TABLE reale di produzione
-- (Supabase Studio dump, fornito da Lorenzo). Vedi conversation
-- log per il dump completo se servisse riallineamento futuro.
-- ============================================================


-- ------------------------------------------------------------
-- subscribers — newsletter mailing list members
--
-- Lifecycle: pending → confirmed (double opt-in) → unsubscribed.
-- The 'blocked' state lands later via 20260413_add_blocked_status.
-- Token is the unguessable key for confirm/unsubscribe URLs.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- email is case-sensitive UNIQUE here; the case-insensitive
  -- defense (UNIQUE INDEX on LOWER(email)) is added by
  -- 20260405_schema_hardening.sql.
  email text NOT NULL UNIQUE,

  name text,

  -- Initial enum: 'pending' | 'confirmed' | 'unsubscribed'.
  -- 20260413_add_blocked_status.sql DROPs+ADDs to include 'blocked'.
  -- NULL is allowed here; 20260405_schema_hardening.sql adds NOT NULL.
  status text DEFAULT 'pending'
    CHECK (status IS NULL OR status IN ('pending', 'confirmed', 'unsubscribed')),

  -- Token used in /api/confirm?token=... and /api/unsubscribe?token=...
  -- UNIQUE constraint (subscribers_token_unique) is added by
  -- 20260405_schema_hardening.sql; we just default-generate it.
  -- NULLABLE to match prod schema exactly (legacy rows may have NULL token).
  token uuid DEFAULT gen_random_uuid(),

  -- Audit timestamps (NULLABLE; prod has no subscribed_at / unsubscribed_at —
  -- unsubscribe is reflected only via status='unsubscribed').
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);


-- ------------------------------------------------------------
-- site_config — single-row table holding dynamic UI strings
--
-- Always queried as `WHERE id = 'main'`. text PK because the row
-- is conceptually a singleton named 'main', not an auto-generated
-- record. updated_at is set manually by the admin config route
-- (no trigger; the value is always passed explicitly in UPDATE).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_config (
  -- Singleton row 'main'; default 'main' lets INSERT-without-id work
  -- (matches prod schema exactly).
  id text PRIMARY KEY DEFAULT 'main',
  tagline text NOT NULL DEFAULT 'EVERY MONDAY',
  venue text NOT NULL DEFAULT '11 Clubroom · Corso Como · Milano',
  updated_at timestamptz DEFAULT now()
);


-- ------------------------------------------------------------
-- scheduled_newsletters — admin-queued newsletters waiting for
-- the cron sender to fire them off
--
-- The cron pattern is "atomic claim": cron sets sent=true via a
-- conditional UPDATE before sending, so concurrent invocations
-- can't double-send. After the new newsletter_campaigns table
-- (20260420_newsletter_open_tracking) was added, this table
-- still holds the "queue" but the actual delivery accounting
-- moved into newsletter_campaigns + newsletter_campaign_recipients.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  html text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);


-- ============================================================
-- Le ALTER successive (20260405_*, 20260413_*, 20260416_*,
-- 20260420_*, 20260426_*, 20260501_*) applicano modifiche
-- successive: aggiungono colonne, indici, constraint, trigger,
-- RLS, e nuove tabelle. Vedi i file di migration relativi.
-- ============================================================
