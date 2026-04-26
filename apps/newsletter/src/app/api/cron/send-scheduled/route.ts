import { timingSafeEqual } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { runCampaignSend, type CampaignSendResult } from "@/lib/send-batch";

// Vercel Hobby caps serverless execution at 60s. The cron drains as much as
// fits inside that window; whatever is left over rolls into the next run.
export const maxDuration = 60;

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

  const startedAt = Date.now();
  const overallBudgetMs = 55_000;
  const remainingBudget = () => Math.max(2_000, overallBudgetMs - (Date.now() - startedAt));

  const scheduledResults: CampaignSendResult[] = [];
  const drainResults: CampaignSendResult[] = [];

  // ============================================================
  // Phase 1: dispatch newly-due scheduled newsletters.
  // ============================================================
  const { data: newsletters, error: fetchError } = await supabase
    .from("scheduled_newsletters")
    .select("*")
    .eq("sent", false)
    .lte("scheduled_at", new Date().toISOString());

  if (fetchError) {
    console.error("[CRON] Database error:", fetchError.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  for (const nl of newsletters ?? []) {
    if (remainingBudget() < 5_000) break;

    // Atomic claim: mark as sent BEFORE sending to prevent double-fire.
    const { data: claimed } = await supabase
      .from("scheduled_newsletters")
      .update({ sent: true })
      .eq("id", nl.id)
      .eq("sent", false)
      .select("id")
      .single();
    if (!claimed) continue;

    const { data: subscribers } = await supabase
      .from("subscribers")
      .select("token")
      .eq("status", "confirmed");
    if (!subscribers || subscribers.length === 0) continue;

    const { data: campaign, error: campaignError } = await supabase
      .from("newsletter_campaigns")
      .insert({
        subject: nl.subject as string,
        source: "scheduled",
        recipient_count: subscribers.length,
        html: nl.html as string,
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

    await supabase
      .from("newsletter_campaigns")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", campaign.id)
      .is("sent_at", null);

    const result = await runCampaignSend({
      campaignId: campaign.id as string,
      subject: nl.subject as string,
      html: nl.html as string,
      siteUrl,
      budgetMs: Math.min(remainingBudget(), 50_000),
    });
    scheduledResults.push(result);
  }

  // ============================================================
  // Phase 2: drain manual campaigns that previously stopped before
  // reaching every recipient. Without this safety net, a stuck
  // campaign would wait for an admin to click "Resume".
  // ============================================================
  if (remainingBudget() > 8_000) {
    const drained = await drainPendingCampaigns(supabase, siteUrl, remainingBudget);
    drainResults.push(...drained);
  }

  return Response.json({
    scheduled: scheduledResults.map(toSummary),
    drained: drainResults.map(toSummary),
    durationMs: Date.now() - startedAt,
  });
}

function toSummary(r: CampaignSendResult) {
  return {
    campaignId: r.campaignId,
    status: r.status,
    delivered: r.delivered,
    retryable: r.retryable,
    failed: r.failed,
    orphaned: r.orphaned,
    totalDelivered: r.totalDelivered,
    totalRecipients: r.totalRecipients,
  };
}

async function drainPendingCampaigns(
  supabase: ReturnType<typeof getSupabase>,
  siteUrl: string,
  remainingBudget: () => number,
): Promise<CampaignSendResult[]> {
  const results: CampaignSendResult[] = [];

  // Pick campaigns whose recipient_count exceeds delivered (sent_count) and
  // for which html is available. We deliberately ignore campaigns that
  // pre-date the html column — they'd error out and only an admin can
  // recover them via the resume endpoint anyway.
  const { data: candidates, error } = await supabase
    .from("newsletter_campaigns")
    .select("id, subject, html, recipient_count, sent_count, sent_at, created_at")
    .not("html", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[CRON] Drain candidates fetch error:", error.message);
    return results;
  }

  for (const c of candidates ?? []) {
    if (remainingBudget() < 5_000) break;
    const recipient = Number(c.recipient_count ?? 0);
    const sent = Number(c.sent_count ?? 0);
    if (recipient <= sent) continue;

    const result = await runCampaignSend({
      campaignId: c.id as string,
      subject: String(c.subject ?? ""),
      html: String(c.html ?? ""),
      siteUrl,
      budgetMs: Math.min(remainingBudget(), 50_000),
    });
    results.push(result);
    if (result.status === "partial") break;
  }

  return results;
}
