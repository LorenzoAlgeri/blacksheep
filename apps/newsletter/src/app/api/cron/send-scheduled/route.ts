import { supabase } from "@/lib/supabase";
import { resend } from "@/lib/resend";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Find scheduled newsletters that are due and not yet sent
  const { data: newsletters, error: fetchError } = await supabase
    .from("scheduled_newsletters")
    .select("*")
    .eq("sent", false)
    .lte("scheduled_at", new Date().toISOString());

  if (fetchError || !newsletters) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  if (newsletters.length === 0) {
    return Response.json({ message: "Nessuna newsletter da inviare" });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const results: { id: string; sent: number; total: number }[] = [];

  for (const nl of newsletters) {
    // Get confirmed subscribers
    const { data: subscribers } = await supabase
      .from("subscribers")
      .select("email, token")
      .eq("status", "confirmed");

    if (!subscribers || subscribers.length === 0) continue;

    let sentCount = 0;
    const batchSize = 50;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const promises = batch.map((sub) => {
        const unsubscribeLink = `<br><a href="${siteUrl}/api/unsubscribe?token=${sub.token}" style="color:#FFFFF340;text-decoration:underline;">Disiscriviti</a>`;
        const personalizedHtml = (nl.html as string).replace(
          "{{UNSUB}}",
          unsubscribeLink,
        );

        return resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ??
            "BLACK SHEEP <noreply@blacksheep.community>",
          to: sub.email,
          subject: nl.subject as string,
          html: personalizedHtml,
        });
      });

      const settled = await Promise.allSettled(promises);
      sentCount += settled.filter((r) => r.status === "fulfilled").length;

      if (i + batchSize < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Mark as sent
    await supabase
      .from("scheduled_newsletters")
      .update({ sent: true })
      .eq("id", nl.id);

    results.push({
      id: nl.id as string,
      sent: sentCount,
      total: subscribers.length,
    });
  }

  return Response.json({ results });
}
