import { NextRequest } from "next/server";
import { contactHelpSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { rateLimitContactHelp } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/origin-check";
import { CONTACT_HELP_RECIPIENTS, renderContactHelpEmail } from "@/lib/contact-help";

/**
 * POST /api/contact-help — "Scrivici" form for users in pending state
 * who cannot find their confirmation email.
 *
 * Two-step persistence: first a row in contact_help_requests (durable
 * audit trail, survives Resend outages), then a Resend email to the
 * founders. If Resend fails, the request is still in the DB for manual
 * triage.
 *
 * NOT gated by BLACKSHEEP_LIST_ENABLED — this is generic user support
 * that we want available even before the BlackSheep List rollout.
 */
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimitContactHelp(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova più tardi." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = contactHelpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  // Honeypot: silent OK — no DB insert, no email
  if (parsed.data.website) {
    return Response.json({ ok: true });
  }

  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const { email, phone, name, message } = parsed.data;

  // 1. Insert audit row (durable backup)
  const supabase = getSupabase();
  const { error: insertError } = await supabase.from("contact_help_requests").insert({
    email,
    phone,
    name,
    message: message ?? null,
    ip,
    user_agent: userAgent,
  });

  if (insertError) {
    console.error("[CONTACT_HELP] DB insert error:", insertError.message, insertError.code);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  // 2. Notify founders via Resend (best-effort: DB has the audit if email fails)
  const { error: emailError } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
    replyTo: email,
    to: [...CONTACT_HELP_RECIPIENTS],
    subject: "Richiesta supporto BlackSheep",
    html: renderContactHelpEmail({ email, phone, name, message, ip, userAgent }),
  });

  if (emailError) {
    console.error("[CONTACT_HELP] Resend error:", emailError);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
