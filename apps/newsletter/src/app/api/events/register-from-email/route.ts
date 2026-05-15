import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { getSupabase } from "@/lib/supabase";
import { getClientIp, getUserAgent } from "@/lib/client-ip";
import { genderSchema } from "@/lib/validations";

/**
 * GET /api/events/register-from-email — token-based registration trigger
 * embedded in newsletter emails.
 *
 * Recipients click the {{TOKEN}}-substituted link and land here. We look
 * up the subscriber by token (must be confirmed) and the event by slug
 * (must be published). If gender is missing, redirect with gender_required
 * status so the page can prompt the user. Otherwise INSERT the registration
 * with source='email_link'.
 *
 * POST handles the gender submission: updates subscriber gender, then
 * registers for the event in one flow.
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

const GenderPostSchema = z.object({
  token: z.uuid(),
  event_slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(80),
  gender: genderSchema,
});

function redirectTo(siteUrl: string, slug: string, status: string, extra?: string): Response {
  const url = `${siteUrl}/newsletter/events/${encodeURIComponent(slug)}/registered?status=${status}${extra ?? ""}`;
  return Response.redirect(url, 303);
}

async function registerSubscriber(
  supabase: ReturnType<typeof getSupabase>,
  eventId: string,
  subscriberId: string,
  request: NextRequest,
) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const { error } = await supabase.from("list_event_registrations").insert({
    event_id: eventId,
    subscriber_id: subscriberId,
    source: "email_link",
    ip,
    user_agent: userAgent,
    consent_version: "1.0",
  });

  return error;
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
    return redirectTo(siteUrl, "unknown", "invalid");
  }

  const { token, event_slug: slug } = parsed.data;
  const supabase = getSupabase();

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, status, gender")
    .eq("token", token)
    .maybeSingle();

  if (!subscriber || subscriber.status !== "confirmed") {
    return redirectTo(siteUrl, slug, "invalid");
  }

  const { data: event } = await supabase
    .from("list_events")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!event || event.status !== "published") {
    return redirectTo(siteUrl, slug, "event_unavailable");
  }

  if (!subscriber.gender) {
    return redirectTo(siteUrl, slug, "gender_required", `&token=${token}&event_slug=${slug}`);
  }

  const insertError = await registerSubscriber(supabase, event.id, subscriber.id, request);

  if (insertError) {
    if (insertError.code === "23505") {
      return redirectTo(siteUrl, slug, "already");
    }
    console.error("[REGISTER_FROM_EMAIL] Insert error:", insertError.message, insertError.code);
    return redirectTo(siteUrl, slug, "invalid");
  }

  return redirectTo(siteUrl, slug, "ok");
}

export async function POST(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const parsed = GenderPostSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { token, event_slug: slug, gender } = parsed.data;
  const supabase = getSupabase();

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();

  if (!subscriber || subscriber.status !== "confirmed") {
    return Response.json({ error: "Token non valido" }, { status: 400 });
  }

  const { data: event } = await supabase
    .from("list_events")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!event || event.status !== "published") {
    return Response.json({ error: "Evento non disponibile" }, { status: 400 });
  }

  await supabase.from("subscribers").update({ gender }).eq("id", subscriber.id);

  const insertError = await registerSubscriber(supabase, event.id, subscriber.id, request);

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json({ status: "already" });
    }
    console.error(
      "[REGISTER_FROM_EMAIL] POST insert error:",
      insertError.message,
      insertError.code,
    );
    return Response.json({ error: "Errore registrazione" }, { status: 500 });
  }

  return Response.json({ status: "ok" });
}
