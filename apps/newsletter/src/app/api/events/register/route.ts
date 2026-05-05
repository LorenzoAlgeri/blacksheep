import { NextRequest } from "next/server";
import { eventRegisterSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { rateLimitEventRegister } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/origin-check";
import { getClientIp, getUserAgent } from "@/lib/client-ip";
import { renderEventRegistrationEmail } from "@/lib/emails/event-registration";

/**
 * POST /api/events/register — public BlackSheep List event registration.
 *
 * The 4 lookup branches are the heart of the UX. They all return HTTP 200
 * (with status field in the body) because they are not errors — they are
 * application states. Real errors (rate-limit, validation, missing event,
 * DB failure) use the appropriate 4xx/5xx code.
 *
 * Anti-enumeration: blocked subscribers receive the same shape as
 * non-existent ones (no_subscriber); a probing attacker cannot tell from
 * the response whether an email is in the system or banned.
 */
export async function POST(request: NextRequest) {
  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (!rateLimitEventRegister(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova tra un minuto." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = eventRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  // Honeypot: silently accept "registered" without doing anything
  if (parsed.data.website) {
    return Response.json({ success: true, status: "registered" });
  }

  const supabase = getSupabase();
  const userAgent = getUserAgent(request);
  const email = parsed.data.email.toLowerCase();
  const { eventId } = parsed.data;

  // 1. Lookup the event — must exist and be published
  const { data: event, error: eventError } = await supabase
    .from("list_events")
    .select("id, title, event_date, venue, description, status")
    .eq("id", eventId)
    .single();

  if (eventError || !event || event.status !== "published") {
    return Response.json({ error: "Evento non disponibile" }, { status: 404 });
  }

  // 2. Lookup the subscriber by lowercase email
  const { data: subscriber, error: subError } = await supabase
    .from("subscribers")
    .select("id, name, status, token, gender")
    .eq("email", email)
    .maybeSingle();

  if (subError) {
    console.error("[EVENTS_REGISTER] Subscriber lookup error:", subError.message, subError.code);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  // 3. Branch on subscriber state
  if (!subscriber || subscriber.status === "blocked") {
    // Anti-enumeration: blocked → same shape as missing
    return Response.json({
      status: "no_subscriber",
      message: "Iscriviti prima alla newsletter, poi potrai registrarti alla lista.",
    });
  }

  if (subscriber.status === "pending") {
    return Response.json({
      status: "pending_subscriber",
      message: "Hai un'email di conferma in sospeso. Conferma prima di iscriverti alla lista.",
    });
  }

  if (subscriber.status !== "confirmed") {
    // unsubscribed / unknown → same anti-enumeration shape
    return Response.json({
      status: "no_subscriber",
      message: "Iscriviti prima alla newsletter, poi potrai registrarti alla lista.",
    });
  }

  // 4. confirmed → check gender (required since 2026-05; legacy users may not have it)
  const incomingGender = parsed.data.gender ?? null;
  if (!subscriber.gender) {
    if (!incomingGender) {
      return Response.json({ status: "gender_required" });
    }
    // Atomic: update gender before registering
    const { error: genderError } = await supabase
      .from("subscribers")
      .update({ gender: incomingGender })
      .eq("id", subscriber.id);
    if (genderError) {
      console.error("[EVENTS_REGISTER] Gender update error:", genderError.message);
      return Response.json({ error: "Errore interno." }, { status: 500 });
    }
  }

  // 5. INSERT registration
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
    console.error("[EVENTS_REGISTER] Insert error:", insertError.message, insertError.code);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  // 5. Send confirmation email (failure here does not roll back the registration)
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
    console.error("[EVENTS_REGISTER] Resend error:", emailError);
    // Registration is committed; the email failure is best-effort
  }

  return Response.json({
    status: "registered",
    eventTitle: event.title,
    eventDate: event.event_date,
  });
}
