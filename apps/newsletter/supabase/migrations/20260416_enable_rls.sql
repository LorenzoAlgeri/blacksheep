-- Enable Row Level Security on all public tables exposed via PostgREST
-- 
-- ARCHITECTURE NOTE:
-- This app uses ONLY the service_role key on the backend (never the anon key).
-- The service_role bypasses RLS by design in Supabase, so all existing
-- backend operations continue to work without any changes.
--
-- These policies close the security gap flagged by Supabase Advisors:
--   - rls_disabled_in_public (ERROR) for subscribers + scheduled_newsletters
--   - sensitive_columns_exposed (ERROR) for subscribers.token
--
-- Result: anon/authenticated roles have ZERO access to these tables.
-- Only the service_role (backend API) can read/write data.

-- ============================================================
-- subscribers
-- ============================================================

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon and authenticated roles (no SELECT, INSERT, UPDATE, DELETE)
-- No explicit policies = deny by default when RLS is enabled.
-- The service_role is exempt from RLS and retains full access.

-- ============================================================
-- scheduled_newsletters
-- ============================================================

ALTER TABLE public.scheduled_newsletters ENABLE ROW LEVEL SECURITY;

-- Same: deny-all for anon/authenticated; service_role retains full access.

-- ============================================================
-- site_config  (also public but not flagged — defensive hardening)
-- ============================================================

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Same: deny-all for anon/authenticated; service_role retains full access.
