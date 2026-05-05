import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  E2E_CONFIRMED_REGISTERED,
  E2E_EVENT_ID,
  E2E_EVENT_SLUG,
  E2E_EVENT_TITLE,
  E2E_EVENT_VENUE,
  E2E_SEED_SUBSCRIBERS,
  E2E_SEED_SUBSCRIBER_IDS,
} from "./fixtures/blacksheep-list";

/**
 * Idempotent seed for the BlackSheep List E2E suite.
 *
 * Strategy:
 *  1. DELETE prior E2E rows in dependency order (registrations → subscribers
 *     → event) — list_events.event_id REFERENCES with ON DELETE RESTRICT.
 *  2. INSERT a published event 14 days in the future.
 *  3. INSERT four E2E subscribers covering the lifecycle states used by
 *     the spec (two confirmed, one pending, one for the email-link path).
 *  4. INSERT a pre-existing registration so the API returns 23505 →
 *     `already_registered` deterministically.
 *  5. DELETE leftover contact_help_requests with @e2e.test emails so the
 *     Scrivici scenario sees the expected 0 → 1 transition.
 *
 * The seed only touches its own deterministic IDs — never wipes the dev
 * dataset. Production safety relies on E2E-only UUIDs and `@e2e.test`
 * (RFC 6761 reserved) email TLDs.
 */

interface SeedResult {
  inserted: { event: number; subscribers: number; registrations: number };
}

function loadEnv(): void {
  // Re-uses the Next.js loader so .env.local picks up the same way as
  // `next dev`. The seed runs in a plain Node context (Playwright global
  // setup), where env vars wouldn't otherwise be auto-loaded.
  loadEnvConfig(path.resolve(__dirname, ".."));
}

function getServiceClient(): SupabaseClient {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error(
      "[e2e seed] Missing NEXT_PUBLIC_SUPABASE_URL — set it in apps/newsletter/.env.local",
    );
  }
  if (!key) {
    throw new Error(
      "[e2e seed] Missing SUPABASE_SERVICE_ROLE_KEY — set it in apps/newsletter/.env.local",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function seedBlackSheepListE2E(): Promise<SeedResult> {
  const supabase = getServiceClient();

  // 1. Cleanup — order matters: list_event_registrations.event_id has
  // ON DELETE RESTRICT, so the registration rows must go first.
  const { error: regDelErr } = await supabase
    .from("list_event_registrations")
    .delete()
    .eq("event_id", E2E_EVENT_ID);
  if (regDelErr) throw new Error(`[e2e seed] cleanup registrations: ${regDelErr.message}`);

  const { error: subDelErr } = await supabase
    .from("subscribers")
    .delete()
    .in("id", [...E2E_SEED_SUBSCRIBER_IDS]);
  if (subDelErr) throw new Error(`[e2e seed] cleanup subscribers: ${subDelErr.message}`);

  const { error: eventDelErr } = await supabase.from("list_events").delete().eq("id", E2E_EVENT_ID);
  if (eventDelErr) throw new Error(`[e2e seed] cleanup event: ${eventDelErr.message}`);

  const { error: contactDelErr } = await supabase
    .from("contact_help_requests")
    .delete()
    .like("email", "%@e2e.test");
  if (contactDelErr) throw new Error(`[e2e seed] cleanup contact_help: ${contactDelErr.message}`);

  // 2. Event — published, two weeks in the future
  const eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { error: eventInsErr } = await supabase.from("list_events").insert({
    id: E2E_EVENT_ID,
    slug: E2E_EVENT_SLUG,
    title: E2E_EVENT_TITLE,
    event_date: eventDate,
    venue: E2E_EVENT_VENUE,
    description: "E2E test event — do not delete during a test run.",
    capacity: 100,
    status: "published",
    published_at: new Date().toISOString(),
    created_by: "playwright-e2e",
  });
  if (eventInsErr) throw new Error(`[e2e seed] insert event: ${eventInsErr.message}`);

  // 3. Subscribers — one row per lifecycle state used by the spec
  const subRows = E2E_SEED_SUBSCRIBERS.map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    status: s.status,
    token: s.token,
    gender: s.gender,
    subscribed_ip: "127.0.0.1",
    subscribed_user_agent: "playwright-e2e",
    consent_version: "1.0",
  }));
  const { error: subInsErr } = await supabase.from("subscribers").insert(subRows);
  if (subInsErr) throw new Error(`[e2e seed] insert subscribers: ${subInsErr.message}`);

  // 4. Pre-existing registration for the "already_registered" scenario
  const { error: regInsErr } = await supabase.from("list_event_registrations").insert({
    event_id: E2E_EVENT_ID,
    subscriber_id: E2E_CONFIRMED_REGISTERED.id,
    source: "form",
    ip: "127.0.0.1",
    user_agent: "playwright-e2e",
    consent_version: "1.0",
  });
  if (regInsErr) throw new Error(`[e2e seed] insert seed registration: ${regInsErr.message}`);

  return {
    inserted: { event: 1, subscribers: subRows.length, registrations: 1 },
  };
}

export function getE2EServiceClient(): SupabaseClient {
  return getServiceClient();
}
