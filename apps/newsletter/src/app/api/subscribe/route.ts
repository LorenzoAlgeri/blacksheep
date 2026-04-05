import { NextRequest } from "next/server";
import { subscribeSchema } from "@/lib/validations";
import { supabase } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { rateLimit } from "@/lib/rate-limit";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
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
  const { name } = parsed.data;

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

  const greeting = name ? `${escapeHtml(name)}, sei dentro.` : "Sei dentro.";

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
    to: email,
    subject: "Conferma la tua iscrizione — BLACK SHEEP",
    html: `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
    <tr><td align="center" style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a0a0a;">

        <!-- Spacer top -->
        <tr><td style="height:60px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- EVERY MONDAY -->
        <tr><td align="center" style="padding:0 40px;">
          <p style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.45em;color:rgba(255,255,243,0.30);text-align:center;">EVERY MONDAY</p>
        </td></tr>

        <!-- BLACK SHEEP -->
        <tr><td align="center" style="padding:14px 40px 0;">
          <h1 style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:52px;letter-spacing:0.02em;line-height:0.85;color:#FFFFF3;">BLACK<br>SHEEP</h1>
        </td></tr>

        <!-- Venue -->
        <tr><td align="center" style="padding:20px 40px 0;">
          <p style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.25em;color:rgba(255,255,243,0.25);text-transform:uppercase;">11 Clubroom &middot; Corso Como &middot; Milano</p>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Cream divider -->
        <tr><td align="center" style="padding:0 80px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="height:1px;background:rgba(255,255,243,0.08);font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Main message -->
        <tr><td align="center" style="padding:0 40px;">
          <p style="margin:0 0 12px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:20px;color:#FFFFF3;letter-spacing:0.02em;">${greeting}</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,243,0.50);">Manca solo un click per entrare nella lista.<br>Lineup, date esclusive e backstage pass &mdash; prima di tutti.</p>
        </td></tr>

        <!-- CTA Button -->
        <tr><td align="center" style="padding:40px 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:320px;"><tr>
            <td align="center" style="background:#FFFFF3;border-radius:4px;">
              <a href="${confirmUrl}" target="_blank" style="display:block;padding:18px 32px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.15em;color:#0a0a0a;text-decoration:none;font-weight:700;text-align:center;">THE PLACE TO BE</a>
            </td>
          </tr></table>
        </td></tr>

        <!-- Micro copy -->
        <tr><td align="center" style="padding:16px 40px 0;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,243,0.25);line-height:1.5;">Iscriviti. Lineup e date prima di tutti.</p>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:56px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Bottom divider -->
        <tr><td align="center" style="padding:0 80px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="height:1px;background:rgba(255,255,243,0.06);font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:24px 40px;">
          <p style="margin:0 0 8px;font-size:10px;color:rgba(255,255,243,0.15);line-height:1.5;">Se non hai richiesto questa iscrizione, ignora questa email.</p>
          <p style="margin:0;font-size:10px;">
            <a href="${unsubscribeUrl}" style="color:rgba(255,255,243,0.15);text-decoration:underline;">Disiscriviti</a>
            &nbsp;&middot;&nbsp;
            <a href="${siteUrl}/privacy" style="color:rgba(255,255,243,0.15);text-decoration:underline;">Privacy Policy</a>
          </p>
        </td></tr>

        <!-- Instagram -->
        <tr><td align="center" style="padding:0 40px 40px;">
          <a href="https://instagram.com/blacksheep.community_" style="font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.1em;color:rgba(255,255,243,0.20);text-decoration:none;">@BLACKSHEEP.COMMUNITY_</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });

  if (emailError) {
    console.error("[SUBSCRIBE] Resend error:", emailError);
    return Response.json({ error: "Errore nell'invio dell'email. Riprova." }, { status: 500 });
  }

  return Response.json({ success: true });
}
