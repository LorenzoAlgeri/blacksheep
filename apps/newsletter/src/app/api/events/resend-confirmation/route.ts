import { NextRequest } from "next/server";
import { resendConfirmationSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { rateLimitResendConfirmEmail, rateLimitResendConfirmIp } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/origin-check";
import { renderConfirmationEmail } from "@/lib/emails/confirmation";

/**
 * POST /api/events/resend-confirmation — re-issue confirmation email
 * for a subscriber stuck in 'pending' status.
 *
 * Anti-enumeration response: every non-pending case (confirmed,
 * unsubscribed, blocked, missing) returns 200 { ok: true } with NO email
 * sent. A probing attacker cannot tell which addresses are pending vs.
 * which simply don't exist.
 *
 * Two-axis rate limit: 1/min per email (anti-bombing) AND 3/15min per IP
 * (anti-bot enumeration). Both must pass.
 */
export async function POST(request: NextRequest) {
  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimitResendConfirmIp(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova più tardi." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = resendConfirmationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  if (!rateLimitResendConfirmEmail(email)) {
    return Response.json(
      { error: "Hai già richiesto un re-invio per questa email. Riprova tra un minuto." },
      { status: 429 },
    );
  }

  const supabase = getSupabase();
  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, name, token, status")
    .eq("email", email)
    .maybeSingle();

  // Anti-enumeration: silent OK for any non-pending subscriber state
  if (!subscriber || subscriber.status !== "pending") {
    return Response.json({ ok: true });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmUrl = `${siteUrl}/api/confirm?token=${subscriber.token}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

  // Reuse site_config for tagline/venue (matches /api/subscribe pattern)
  let tagline = "EVERY MONDAY";
  let venue = "11 Clubroom · Corso Como · Milano";
  try {
    const { data: cfg } = await supabase
      .from("site_config")
      .select("tagline, venue")
      .eq("id", "main")
      .single();
    if (cfg) {
      tagline = cfg.tagline;
      venue = cfg.venue;
    }
  } catch {
    // fallback to defaults
  }

  const { error: emailError } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
    replyTo: process.env.REPLY_TO_EMAIL ?? undefined,
    to: email,
    subject: "Conferma la tua iscrizione — BLACK SHEEP",
    html: renderConfirmationEmail({
      name: subscriber.name ?? undefined,
      confirmUrl,
      unsubscribeUrl,
      tagline,
      venue,
      siteUrl,
    }),
  });

  if (emailError) {
    console.error("[RESEND_CONFIRM] Resend error:", emailError);
    return Response.json({ error: "Errore nell'invio dell'email." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
