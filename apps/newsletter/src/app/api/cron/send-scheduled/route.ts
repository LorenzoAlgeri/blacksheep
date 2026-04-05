import { timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase";
import { sendBatchEmails } from "@/lib/send-batch";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const expected = `Bearer ${cronSecret}`;
  if (!cronSecret || !authHeader || authHeader.length !== expected.length || !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

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
    // Atomic claim: mark as sent BEFORE sending to prevent double-fire
    const { data: claimed } = await supabase
      .from("scheduled_newsletters")
      .update({ sent: true })
      .eq("id", nl.id)
      .eq("sent", false)
      .select("id")
      .single();

    // If no rows affected, another instance already claimed it — skip
    if (!claimed) continue;

    const { data: subscribers } = await supabase
      .from("subscribers")
      .select("email, token")
      .eq("status", "confirmed");

    if (!subscribers || subscribers.length === 0) continue;

    const result = await sendBatchEmails(
      subscribers,
      nl.subject as string,
      nl.html as string,
      siteUrl,
    );

    results.push({ id: nl.id as string, ...result });
  }

  return Response.json({ results });
}
