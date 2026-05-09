import { NextRequest } from "next/server";
import { registerAndSubscribeSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { rateLimitRegisterAndSubscribe } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/origin-check";
import { getClientIp, getUserAgent } from "@/lib/client-ip";
import { renderConfirmationEmail } from "@/lib/emails/confirmation";
import { renderEventRegistrationEmail } from "@/lib/emails/event-registration";

/**
 * POST /api/events/register-and-subscribe — combined newsletter subscription +
 * event registration for non-subscribers.
 *
 * For brand-new / unsubscribed / pending users:
 *  1. Upsert as `pending` subscriber (same logic as /api/subscribe)
 *  2. Queue intent in `pending_event_intents` (processed on double-opt-in)
 *  3. Send confirmation email
 *  4. Return { status: "pending_confirmation" }
 *
 * Edge case: if the subscriber is already `confirmed`, register directly to
 * the event and return { status: "registered" }.
 *
 * Anti-enumeration: blocked subscribers receive { status: "no_subscriber" }
 * so an attacker cannot distinguish blocked from non-existent.
 */
export async function POST(request: NextRequest) {
  // 1. Feature flag
  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Origin check (CSRF defense for anonymous POST)
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Rate limit
  const ip = getClientIp(request);
  if (!rateLimitRegisterAndSubscribe(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova tra un minuto." }, { status: 429 });
  }

  // 4. Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  // 5. Validate with Zod schema
  const parsed = registerAndSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  // 6. Honeypot: silently accept without doing anything
  if (parsed.data.website) {
    return Response.json({ success: true, status: "pending_confirmation" });
  }

  const supabase = getSupabase();
  const userAgent = getUserAgent(request);
  const email = parsed.data.email.toLowerCase();
  const { eventId, name, gender } = parsed.data;

  // 7. Lookup event — must exist, be published, and deadline not passed
  const { data: event, error: eventError } = await supabase
    .from("list_events")
    .select("id, title, event_date, venue, description, status, registration_deadline")
    .eq("id", eventId)
    .single();

  if (eventError || !event || event.status !== "published") {
    return Response.json({ error: "Evento non disponibile" }, { status: 404 });
  }

  if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
    return Response.json({ error: "Iscrizioni chiuse" }, { status: 403 });
  }

  // 8. Lookup subscriber by lowercase email
  const { data: subscriber, error: subError } = await supabase
    .from("subscribers")
    .select("id, name, status, token, gender")
    .eq("email", email)
    .maybeSingle();

  if (subError) {
    console.error(
      "[REGISTER_AND_SUBSCRIBE] Subscriber lookup error:",
      subError.message,
      subError.code,
    );
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  // 9. Branch on subscriber state
  if (subscriber?.status === "blocked") {
    // Anti-enumeration: blocked → same shape as missing
    return Response.json({
      status: "no_subscriber",
      message: "Iscriviti prima alla newsletter, poi potrai registrarti alla lista.",
    });
  }

  if (subscriber?.status === "confirmed") {
    // Already confirmed → register directly to event

    // Check gender: if subscriber has no gender, update it atomically
    if (!subscriber.gender) {
      const { error: genderError } = await supabase
        .from("subscribers")
        .update({ gender })
        .eq("id", subscriber.id);
      if (genderError) {
        console.error("[REGISTER_AND_SUBSCRIBE] Gender update error:", genderError.message);
        return Response.json({ error: "Errore interno." }, { status: 500 });
      }
    }

    // INSERT event registration
    const { error: insertError } = await supabase.from("list_event_registrations").insert({
      event_id: event.id,
      subscriber_id: subscriber.id,
      source: "form",
      ip,
      user_agent: userAgent,
      consent_version: "1.0",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return Response.json({
          status: "already_registered",
          message: "Sei già iscritto a questo evento",
          eventTitle: event.title,
          eventDate: event.event_date,
        });
      }
      console.error(
        "[REGISTER_AND_SUBSCRIBE] Insert error:",
        insertError.message,
        insertError.code,
      );
      return Response.json({ error: "Errore interno." }, { status: 500 });
    }

    // Send event confirmation email (best-effort)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

    const { error: emailError } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
      replyTo: process.env.REPLY_TO_EMAIL ?? undefined,
      to: email,
      subject: `Sei in lista — ${event.title}`,
      html: renderEventRegistrationEmail({
        name: subscriber.name ?? undefined,
        eventTitle: event.title,
        eventDate: event.event_date,
        eventVenue: event.venue,
        eventDescription: event.description,
        unsubscribeUrl,
        siteUrl,
      }),
    });

    if (emailError) {
      console.error("[REGISTER_AND_SUBSCRIBE] Resend error:", emailError);
    }

    return Response.json({
      status: "registered",
      eventTitle: event.title,
      eventDate: event.event_date,
    });
  }

  // pending / new / unsubscribed → upsert as pending subscriber
  const { data: upserted, error: dbError } = await supabase
    .from("subscribers")
    .upsert(
      {
        email,
        name,
        gender,
        status: "pending",
        subscribed_ip: ip,
        subscribed_user_agent: userAgent,
        consent_version: "1.0",
      },
      { onConflict: "email" },
    )
    .select("token")
    .single();

  if (dbError) {
    console.error(
      "[REGISTER_AND_SUBSCRIBE] Supabase upsert error:",
      dbError.message,
      dbError.code,
      dbError.details,
    );
    return Response.json({ error: "Errore interno. Riprova." }, { status: 500 });
  }

  // Queue event intent (processed after confirmation via /api/confirm)
  const { error: intentError } = await supabase.from("pending_event_intents").insert({
    subscriber_email: email,
    event_id: event.id,
    ip,
    user_agent: userAgent,
  });

  if (intentError) {
    // ON CONFLICT DO NOTHING at DB level; log other errors
    if (intentError.code !== "23505") {
      console.error(
        "[REGISTER_AND_SUBSCRIBE] Intent insert error:",
        intentError.message,
        intentError.code,
      );
    }
  }

  // Fetch site_config for confirmation email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmUrl = `${siteUrl}/api/confirm?token=${upserted.token}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${upserted.token}`;

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

  // Send double-opt-in confirmation email
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
    console.error("[REGISTER_AND_SUBSCRIBE] Resend error:", emailError);
    return Response.json({ error: "Errore nell'invio dell'email. Riprova." }, { status: 500 });
  }

  return Response.json({ success: true, status: "pending_confirmation" });
}
