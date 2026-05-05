import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isSubscriberUnsubscribable } from "@/lib/subscriber-status";
import { getClientIp, getUserAgent } from "@/lib/client-ip";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: standard unsubscribe (status change only)
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !UUID_RE.test(token)) {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, status")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  if (!isSubscriberUnsubscribable(subscriber.status)) {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  const { error: updateError } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("id", subscriber.id);

  if (updateError) {
    console.error("[SUBSCRIBE] Unsubscribe update error:", updateError.message);
    return Response.redirect(new URL("/newsletter/?error=server", request.url));
  }

  // Redirect to unsubscribe page with token so user can request full deletion
  return Response.redirect(new URL(`/newsletter/unsubscribe?token=${token}`, request.url));
}

// POST: GDPR Art. 17 — full data erasure
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);

  let body: { token?: string; gdprDelete?: boolean } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const tokenFromQuery = searchParams.get("token") ?? undefined;
  const tokenFromBody = body?.token;
  const token = tokenFromQuery ?? tokenFromBody;

  if (!token || !UUID_RE.test(token)) {
    return Response.json({ error: "Token non valido.", code: "INVALID_TOKEN" }, { status: 400 });
  }

  const shouldDelete = searchParams.get("gdpr") === "delete" || body?.gdprDelete === true;

  if (!shouldDelete) {
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("id, status")
      .eq("token", token)
      .single();

    if (!subscriber) {
      return Response.json({ success: true, unsubscribed: false }, { status: 200 });
    }

    if (!isSubscriberUnsubscribable(subscriber.status)) {
      return Response.json({ success: true, unsubscribed: false }, { status: 200 });
    }

    const { error: updateError } = await supabase
      .from("subscribers")
      .update({ status: "unsubscribed" })
      .eq("id", subscriber.id);

    if (updateError) {
      console.error("[SUBSCRIBE] One-click unsubscribe update error:", updateError.message);
      return Response.json(
        { error: "Errore durante la disiscrizione.", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    return Response.json({ success: true, unsubscribed: true }, { status: 200 });
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, email")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.json({ error: "Utente non trovato.", code: "NOT_FOUND" }, { status: 404 });
  }

  // GDPR Art. 17: permanent deletion
  const { error: deleteError } = await supabase
    .from("subscribers")
    .delete()
    .eq("id", subscriber.id);

  if (deleteError) {
    console.error("[SUBSCRIBE] GDPR erasure error:", deleteError.message);
    return Response.json(
      { error: "Errore durante la cancellazione.", code: "DB_ERROR" },
      { status: 500 },
    );
  }

  // [SEC-009] GDPR Art. 30 audit log of the erasure event itself.
  // No personal data (email, name) is retained — only the surrogate id —
  // but we capture WHO triggered it (IP / User-Agent) and WHEN, so a future
  // dispute over an unauthorised deletion can be investigated. The record
  // lives in the platform's stdout sink (Vercel Logs); ingest into a long-term
  // store is the next hardening step (TODO).
  console.log(
    JSON.stringify({
      event: "gdpr_erasure",
      subscriberId: subscriber.id,
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
      at: new Date().toISOString(),
    }),
  );

  return Response.json({ success: true, deleted: true });
}
