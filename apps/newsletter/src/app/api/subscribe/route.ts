import { NextRequest } from "next/server";
import { subscribeSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { renderConfirmationEmail } from "@/lib/emails/confirmation";

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  // Rate limit by IP — getClientIp normalises proxy chains (SEC-008).
  const ip = getClientIp(request);
  if (!rateLimit(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova tra un minuto." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  // Honeypot: if "website" field has content, it's a bot
  if (parsed.data.website) {
    // Return 200 to not reveal the honeypot
    return Response.json({ success: true });
  }

  const email = parsed.data.email.toLowerCase();
  const { name, gender } = parsed.data;

  // GDPR: capture consent metadata for audit trail
  const subscribedIp = ip;
  const subscribedUserAgent = request.headers.get("user-agent") ?? "unknown";
  const consentVersion = "1.0";

  // Check if subscriber already exists
  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, token, status")
    .eq("email", email)
    .single();

  // If blocked by admin, silently reject (don't reveal blocked state)
  if (existing?.status === "blocked") {
    return Response.json({ success: true });
  }

  // If already confirmed, return success silently (no-op)
  if (existing?.status === "confirmed") {
    return Response.json({ success: true });
  }

  // If already pending, don't resend confirmation (prevents subscription bombing)
  if (existing?.status === "pending") {
    return Response.json({ success: true });
  }

  // Insert or update subscriber (for new or unsubscribed users)
  const { data: subscriber, error: dbError } = await supabase
    .from("subscribers")
    .upsert(
      {
        email,
        name,
        gender,
        status: "pending",
        subscribed_ip: subscribedIp,
        subscribed_user_agent: subscribedUserAgent,
        consent_version: consentVersion,
      },
      { onConflict: "email" },
    )
    .select("token")
    .single();

  if (dbError) {
    console.error("[SUBSCRIBE] Supabase error:", dbError.message, dbError.code, dbError.details);
    return Response.json({ error: "Errore interno. Riprova." }, { status: 500 });
  }

  // Send confirmation email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmUrl = `${siteUrl}/api/confirm?token=${subscriber.token}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

  // Fetch dynamic config (tagline/venue) from site_config — pass raw values
  // to renderConfirmationEmail; escaping is applied inside the renderer.
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
      name,
      confirmUrl,
      unsubscribeUrl,
      tagline,
      venue,
      siteUrl,
    }),
  });

  if (emailError) {
    console.error("[SUBSCRIBE] Resend error:", emailError);
    return Response.json({ error: "Errore nell'invio dell'email. Riprova." }, { status: 500 });
  }

  return Response.json({ success: true });
}
