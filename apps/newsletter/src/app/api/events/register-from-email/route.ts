import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { getSupabase } from "@/lib/supabase";
import { getClientIp, getUserAgent } from "@/lib/client-ip";

/**
 * GET /api/events/register-from-email — token-based registration trigger
 * embedded in newsletter emails.
 *
 * Recipients click the {{TOKEN}}-substituted link and land here. We look
 * up the subscriber by token (must be confirmed) and the event by slug
 * (must be published), then INSERT the registration with source='email_link'.
 * Always redirect to /newsletter/events/[slug]/registered with a status
 * query string — the page renders the appropriate brand UI for each
 * outcome.
 *
 * No rate limit: tokens are unguessable secrets, and the link is one-shot
 * for the recipient (idempotent via UNIQUE constraint).
 */

const QuerySchema = z.object({
  token: z.uuid(),
  event_slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(80),
});

function redirectTo(siteUrl: string, slug: string, status: string): Response {
  const url = `${siteUrl}/newsletter/events/${encodeURIComponent(slug)}/registered?status=${status}`;
  return Response.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    token: url.searchParams.get("token") ?? "",
    event_slug: url.searchParams.get("event_slug") ?? "",
  });

  if (!parsed.success) {
    // We don't have a valid slug to redirect to — use a placeholder.
    return redirectTo(siteUrl, "unknown", "invalid");
  }

  const { token, event_slug: slug } = parsed.data;
  const supabase = getSupabase();

  // 1. Lookup the subscriber — must be confirmed
  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();

  if (!subscriber || subscriber.status !== "confirmed") {
    return redirectTo(siteUrl, slug, "invalid");
  }

  // 2. Lookup the event — must be published
  const { data: event } = await supabase
    .from("list_events")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!event || event.status !== "published") {
    return redirectTo(siteUrl, slug, "event_unavailable");
  }

  // 3. INSERT registration with source='email_link'
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const { error: insertError } = await supabase.from("list_event_registrations").insert({
    event_id: event.id,
    subscriber_id: subscriber.id,
    source: "email_link",
    ip,
    user_agent: userAgent,
    consent_version: "1.0",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return redirectTo(siteUrl, slug, "already");
    }
    console.error("[REGISTER_FROM_EMAIL] Insert error:", insertError.message, insertError.code);
    return redirectTo(siteUrl, slug, "invalid");
  }

  return redirectTo(siteUrl, slug, "ok");
}
