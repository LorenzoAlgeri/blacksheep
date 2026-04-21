import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

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
    .select("id")
    .eq("token", token)
    .single();

  if (!subscriber) {
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
      .select("id")
      .eq("token", token)
      .single();

    if (!subscriber) {
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

  // Audit log (server-side only — no personal data retained)
  console.log(
    `[SUBSCRIBE] GDPR erasure: subscriber ${subscriber.id} data deleted at ${new Date().toISOString()}`,
  );

  return Response.json({ success: true, deleted: true });
}
