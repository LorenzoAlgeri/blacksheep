import { NextRequest } from "next/server";
import { subscribeSchema } from "@/lib/validations";
import { supabase } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return Response.json(
      { error: "Troppi tentativi. Riprova tra un minuto." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Dati non validi." },
      { status: 400 },
    );
  }

  // Honeypot: if "website" field has content, it's a bot
  if (parsed.data.website) {
    // Return 200 to not reveal the honeypot
    return Response.json({ success: true });
  }

  const { email, name } = parsed.data;

  // Insert subscriber (upsert to handle re-subscribes)
  const { data: subscriber, error: dbError } = await supabase
    .from("subscribers")
    .upsert(
      { email, name, status: "pending" },
      { onConflict: "email" },
    )
    .select("token")
    .single();

  if (dbError) {
    console.error("Supabase error:", dbError.message, dbError.code, dbError.details);
    return Response.json(
      { error: "Errore interno. Riprova." },
      { status: 500 },
    );
  }

  // Send confirmation email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmUrl = `${siteUrl}/api/confirm?token=${subscriber.token}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

  // In dev, skip email send (domain not verified) — log the URL to console instead
  if (process.env.NODE_ENV === "development") {
    console.log("[DEV] Confirmation URL (email skipped):", confirmUrl);
    return Response.json({ success: true });
  }

  const { error: emailError } = await resend.emails.send({
    from: "BLACK SHEEP <noreply@blacksheep.community>",
    to: email,
    subject: "Conferma la tua iscrizione — BLACK SHEEP",
    html: `
      <div style="background:#031240;color:#FFFFF3;padding:40px;font-family:'Arial Black',Arial,sans-serif;text-align:center;">
        <h1 style="color:#BE8305;font-size:32px;letter-spacing:0.1em;">BLACK SHEEP</h1>
        <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;margin:24px 0;">Conferma la tua email per entrare nella lista.</p>
        <a href="${confirmUrl}" style="display:inline-block;background:#BE8305;color:#031240;padding:14px 32px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.05em;">CONFERMA</a>
        <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#FFFFF380;margin-top:32px;">Se non hai richiesto l'iscrizione, ignora questa email.</p>
        <hr style="border:none;border-top:1px solid #FFFFF320;margin:32px 0;" />
        <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#FFFFF340;text-align:center;">
          <a href="${unsubscribeUrl}" style="color:#FFFFF340;text-decoration:underline;">Disiscriviti</a>
        </p>
      </div>
    `,
  });

  if (emailError) {
    console.error("Resend error:", emailError);
    return Response.json(
      { error: "Errore nell'invio dell'email. Riprova." },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
