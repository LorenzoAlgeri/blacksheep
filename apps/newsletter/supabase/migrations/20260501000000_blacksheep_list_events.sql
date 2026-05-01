-- ============================================================
-- BlackSheep List — events, registrations, contact-help requests
-- ============================================================
--
-- Phase 1 of the BlackSheep List rollout (see plan section A).
--
-- Strictly additive migration: only CREATE TABLE on NEW tables.
-- NEVER ALTERs `subscribers`, `site_config`, or any pre-existing
-- schema (other migrations stay the source of truth for those).
--
-- Companion rollback (documental, not auto-applied):
--   .rollback_20260501.sql
--
-- The shared trigger function `update_updated_at_column()` is
-- already defined in 20260405_schema_hardening.sql and is reused
-- here as-is — no redefinition.
-- ============================================================


-- ------------------------------------------------------------
-- list_events
--
-- Public-facing event entries. Lifecycle is draft → published →
-- archived. Soft-archive (status='archived') is the canonical
-- delete path; hard delete is gated behind ?hard=1 and a
-- registration count of zero (see plan section D).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.list_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- slug must be lowercase + dash, 3-80 chars, no underscore
  -- (URL consistency: /newsletter/events/<slug>)
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 80),

  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  event_date timestamptz NOT NULL,
  venue text NOT NULL CHECK (length(venue) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR length(description) <= 5000),

  -- NULL capacity = unlimited (no soft cap UI badge); positive integer otherwise
  capacity int CHECK (capacity IS NULL OR capacity > 0),

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  created_by text
);

-- Hot path: public homepage lists only future + published events ordered by date
CREATE INDEX IF NOT EXISTS list_events_status_event_date_idx
  ON public.list_events (status, event_date)
  WHERE status = 'published';

-- General-purpose index for admin filters / archive lookups
CREATE INDEX IF NOT EXISTS list_events_event_date_idx
  ON public.list_events (event_date);

-- Trigger naming aligned with trg_subscribers_updated_at (20260405_schema_hardening.sql)
DROP TRIGGER IF EXISTS trg_list_events_updated_at ON public.list_events;
CREATE TRIGGER trg_list_events_updated_at
  BEFORE UPDATE ON public.list_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- list_event_registrations
--
-- Idempotent registration log — UNIQUE (event_id, subscriber_id)
-- enforces "one subscriber, one entry per event" at the DB layer.
-- App code catches PostgreSQL error 23505 to detect duplicates.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.list_event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- RESTRICT on list_events: preserve audit log; soft archive via
  -- status='archived' is the canonical close path (see DELETE
  -- /api/admin/events/[id])
  event_id uuid NOT NULL REFERENCES public.list_events(id) ON DELETE RESTRICT,

  -- CASCADE on subscribers: GDPR right-to-erasure (deleting a
  -- subscriber must remove their registrations too)
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,

  source text NOT NULL CHECK (source IN ('form','email_link','admin')),
  registered_at timestamptz NOT NULL DEFAULT now(),

  -- Audit metadata captured per registration for GDPR consent trail
  ip text,
  user_agent text,
  consent_version text DEFAULT '1.0',

  UNIQUE (event_id, subscriber_id)
);

-- Admin "registrations per event" page sorts by most recent first
CREATE INDEX IF NOT EXISTS list_event_registrations_event_idx
  ON public.list_event_registrations (event_id, registered_at DESC);

-- Reverse lookup: "what events did this subscriber register to?"
CREATE INDEX IF NOT EXISTS list_event_registrations_subscriber_idx
  ON public.list_event_registrations (subscriber_id);


-- ------------------------------------------------------------
-- contact_help_requests
--
-- Audit log for the "Scrivici" form (plan section I). Standalone:
-- no FK to subscribers — the user might not yet exist as a row.
-- The submission also fires a Resend email to the founders; this
-- table is the durable backup so nothing is lost if email fails.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text NOT NULL,
  name text NOT NULL,
  message text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

CREATE INDEX IF NOT EXISTS contact_help_requests_created_idx
  ON public.contact_help_requests (created_at DESC);


-- ------------------------------------------------------------
-- Row Level Security
--
-- RLS deny-anon: no policy = total deny for anon/authenticated;
-- service_role bypasses RLS by design (aligns with
-- 20260416_enable_rls.sql). The backend uses ONLY the service_role
-- key, so this is the secure-by-default posture.
-- ------------------------------------------------------------
ALTER TABLE public.list_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_event_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_help_requests      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- End of 20260501_blacksheep_list_events.sql
-- ============================================================
