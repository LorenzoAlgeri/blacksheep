import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { parseResendWebhookEvent } from "@/lib/resend-webhook";
import { verifySvixSignature } from "@/lib/svix-verify";

/**
 * POST /api/webhooks/resend — Resend delivery-event webhook.
 *
 * On a hard bounce or spam complaint we mark the matching subscriber(s) as
 * 'blocked' so they're excluded from future sends (the sender requires
 * status='confirmed'). Signature is verified with the Svix scheme; unhandled
 * events are acknowledged with 200 so Resend doesn't retry them.
 *
 * Configure in Resend: point the webhook at /newsletter/api/webhooks/resend and
 * set RESEND_WEBHOOK_SECRET (the `whsec_...` signing secret) in the environment.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[RESEND_WEBHOOK] Missing RESEND_WEBHOOK_SECRET");
    return Response.json({ error: "Webhook non configurato" }, { status: 500 });
  }

  // Raw body is required for signature verification — read it before parsing.
  const rawBody = await request.text();
  const valid = verifySvixSignature(
    secret,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    rawBody,
  );
  if (!valid) {
    console.warn("[RESEND_WEBHOOK] Invalid or missing signature");
    return Response.json({ error: "Firma non valida" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Payload non valido" }, { status: 400 });
  }

  const action = parseResendWebhookEvent(payload);
  if (!action.shouldBlock || action.emails.length === 0) {
    return Response.json({ ok: true, handled: false, type: action.type });
  }

  const supabase = getSupabase();
  let blocked = 0;
  for (const email of action.emails) {
    const { error, count } = await supabase
      .from("subscribers")
      .update({ status: "blocked" }, { count: "exact" })
      .ilike("email", email) // case-insensitive exact match (no wildcards)
      .neq("status", "blocked"); // idempotent: don't re-touch already-blocked rows
    if (error) {
      console.error(`[RESEND_WEBHOOK] block update error for ${email}:`, error.message);
      continue;
    }
    blocked += count ?? 0;
  }

  return Response.json({
    ok: true,
    handled: true,
    type: action.type,
    reason: action.reason,
    blocked,
  });
}
