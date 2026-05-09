import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { renderEventRegistrationEmail } from "@/lib/emails/event-registration";

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const token = request.nextUrl.searchParams.get("token");
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!token || !UUID_RE.test(token)) {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, email, status, token")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  if (subscriber.status === "confirmed") {
    return Response.redirect(new URL("/newsletter/confirm?already=true", request.url));
  }

  // [SEC-001] Whitelist confirm path. Only 'pending' subscribers may flip
  // to 'confirmed'. Any other state (blocked, unsubscribed, an unknown
  // future enum, NULL) is treated as an invalid token so that:
  //   - admin block decisions are preserved (blocked → not re-confirmed),
  //   - unsubscribed users don't silently re-confirm via a stale link,
  //   - any future status added to the schema fails closed by default.
  if (subscriber.status !== "pending") {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  const { error: updateError } = await supabase
    .from("subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", subscriber.id);

  if (updateError) {
    console.error("[SUBSCRIBE] Confirm update error:", updateError.message);
    return Response.redirect(new URL("/newsletter/?error=server", request.url));
  }

  // --- Process pending event intents (graceful degradation) ---
  let anyEventProcessed = false;

  try {
    const { data: intents, error: intentsError } = await supabase
      .from("pending_event_intents")
      .select("event_id")
      .eq("subscriber_id", subscriber.id);

    if (intentsError) {
      throw intentsError;
    }

    if (intents && intents.length > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

      for (const intent of intents) {
        // Load event — must be published with deadline not passed
        const { data: event } = await supabase
          .from("list_events")
          .select("id, title, event_date, venue, description, status, registration_deadline")
          .eq("id", intent.event_id)
          .single();

        if (!event || event.status !== "published") {
          continue; // archived/draft/missing — silently discard
        }

        if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
          continue; // deadline passed — silently discard
        }

        // INSERT registration (ON CONFLICT DO NOTHING via unique constraint)
        const { error: insertError } = await supabase.from("list_event_registrations").insert({
          event_id: event.id,
          subscriber_id: subscriber.id,
          source: "form",
        });

        if (insertError) {
          // 23505 = duplicate key → already registered, skip silently
          if (insertError.code !== "23505") {
            console.error("[CONFIRM] Registration insert error:", insertError.message);
          }
          continue;
        }

        // Send event confirmation email (best-effort)
        const { error: emailError } = await getResend().emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
          to: subscriber.email,
          subject: `Sei in lista — ${event.title}`,
          html: renderEventRegistrationEmail({
            eventTitle: event.title,
            eventDate: event.event_date,
            eventVenue: event.venue,
            eventDescription: event.description,
            unsubscribeUrl,
            siteUrl,
          }),
        });

        if (emailError) {
          console.error("[CONFIRM] Event email error:", emailError);
        }

        anyEventProcessed = true;
      }

      // Clean up all intents for this subscriber regardless of outcome
      await supabase.from("pending_event_intents").delete().eq("subscriber_id", subscriber.id);
    }
  } catch (err) {
    // Intent processing failed — subscriber is still confirmed (graceful degradation)
    console.error("[CONFIRM] Intent processing error:", err);
  }

  const redirectUrl = anyEventProcessed ? "/newsletter/confirm?event=true" : "/newsletter/confirm";

  return Response.redirect(new URL(redirectUrl, request.url));
}
