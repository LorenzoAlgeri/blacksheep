import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { sendNewsletterSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sendNewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { subject, html } = parsed.data;

  // Get confirmed subscribers
  const { data: subscribers, error: dbError } = await supabase
    .from("subscribers")
    .select("email, token")
    .eq("status", "confirmed");

  if (dbError || !subscribers) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json({ error: "Nessun iscritto confermato" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Send in batches of 50
  const batchSize = 50;
  let sentCount = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const promises = batch.map((sub) => {
      const unsubscribeLink = `<br><a href="${siteUrl}/api/unsubscribe?token=${sub.token}" style="color:#FFFFF340;text-decoration:underline;">Disiscriviti</a>`;
      const personalizedHtml = html.replace("{{UNSUB}}", unsubscribeLink);

      return resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
        to: sub.email,
        subject,
        html: personalizedHtml,
      });
    });

    const results = await Promise.allSettled(promises);
    sentCount += results.filter((r) => r.status === "fulfilled").length;

    // Small delay between batches
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return Response.json({ sent: sentCount, total: subscribers.length });
}
