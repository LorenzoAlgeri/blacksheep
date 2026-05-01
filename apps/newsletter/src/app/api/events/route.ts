import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/events — public list of upcoming published events.
 *
 * Returns up to 50 future + published events, ordered by event_date ASC.
 * Response shape is intentionally minimal: created_by, published_at,
 * created_at are NOT exposed (admin-only). current_registrations is also
 * NOT exposed for privacy (no leak of attendance counts).
 *
 * Gated by BLACKSHEEP_LIST_ENABLED — endpoint returns 404 when off so
 * the feature is fully invisible to anonymous traffic until rollout.
 */
export async function GET(_request: NextRequest) {
  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("list_events")
    .select("id, slug, title, event_date, venue, description, capacity")
    .eq("status", "published")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[EVENTS] Supabase error:", error.message, error.code);
    return Response.json({ error: "Errore interno" }, { status: 500 });
  }

  return Response.json({ events: data ?? [] });
}
