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

  const { subject, body: content } = parsed.data;

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

    const promises = batch.map((sub) =>
      resend.emails.send({
        from: "BLACK SHEEP <noreply@blacksheep.community>",
        to: sub.email,
        subject,
        html: `
          <div style="background:#031240;color:#FFFFF3;padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <h1 style="font-family:'Arial Black',Arial,sans-serif;color:#BE8305;font-size:28px;letter-spacing:0.1em;text-align:center;">BLACK SHEEP</h1>
            <div style="margin:24px 0;font-size:16px;line-height:1.6;">${content}</div>
            <hr style="border:none;border-top:1px solid #FFFFF320;margin:32px 0;" />
            <p style="font-size:11px;color:#FFFFF340;text-align:center;">
              <a href="${siteUrl}/api/unsubscribe?token=${sub.token}" style="color:#FFFFF340;text-decoration:underline;">Disiscriviti</a>
            </p>
          </div>
        `,
      }),
    );

    const results = await Promise.allSettled(promises);
    sentCount += results.filter((r) => r.status === "fulfilled").length;

    // Small delay between batches
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return Response.json({ sent: sentCount, total: subscribers.length });
}
