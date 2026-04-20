import { timingSafeEqual } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { sendBatchEmails } from "@/lib/send-batch";

export async function GET(request: Request) {
  const supabase = getSupabase();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const expected = `Bearer ${cronSecret}`;
  if (
    !cronSecret ||
    !authHeader ||
    authHeader.length !== expected.length ||
    !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  ) {
    console.warn("[CRON] Unauthorized access to send-scheduled");
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: newsletters, error: fetchError } = await supabase
    .from("scheduled_newsletters")
    .select("*")
    .eq("sent", false)
    .lte("scheduled_at", new Date().toISOString());

  if (fetchError || !newsletters) {
    console.error("[CRON] Database error:", fetchError?.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
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

    const { data: campaign, error: campaignError } = await supabase
      .from("newsletter_campaigns")
      .insert({
        subject: nl.subject as string,
        source: "scheduled",
        recipient_count: subscribers.length,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      console.error("[CRON] Campaign creation error:", campaignError?.message);
      continue;
    }

    const recipientsPayload = subscribers.map((subscriber) => ({
      campaign_id: campaign.id,
      subscriber_token: subscriber.token,
    }));

    const { error: recipientsError } = await supabase
      .from("newsletter_campaign_recipients")
      .insert(recipientsPayload);

    if (recipientsError) {
      console.error("[CRON] Campaign recipients insert error:", recipientsError.message);
      continue;
    }

    const result = await sendBatchEmails(
      subscribers,
      nl.subject as string,
      nl.html as string,
      siteUrl,
      { campaignId: campaign.id },
    );

    await supabase
      .from("newsletter_campaigns")
      .update({ sent_count: result.sent, sent_at: new Date().toISOString() })
      .eq("id", campaign.id);

    results.push({ id: nl.id as string, ...result });
  }

  return Response.json({ results });
}
