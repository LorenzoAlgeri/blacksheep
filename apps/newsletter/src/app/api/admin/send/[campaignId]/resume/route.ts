import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { runCampaignSend } from "@/lib/send-batch";

export const maxDuration = 60;

/**
 * Resume sending for a campaign that previously stopped before reaching every
 * recipient. The campaign's HTML is normally stored on `newsletter_campaigns.html`
 * (populated by the original send), but legacy campaigns from before that
 * column existed (e.g. "Ci sei dentro." sent on 2026-04-25) accept a one-time
 * `html` override in the request body, which is then persisted for future
 * resumes.
 */
export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const supabase = getSupabase();
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { campaignId } = await context.params;
  if (!campaignId || !/^[0-9a-f-]{36}$/i.test(campaignId)) {
    return Response.json(
      { error: "Campaign id non valido", code: "INVALID_CAMPAIGN_ID" },
      { status: 400 },
    );
  }

  let bodyHtml: string | undefined;
  let bodySubject: string | undefined;
  if (request.headers.get("content-length") && request.headers.get("content-length") !== "0") {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body.html === "string" && body.html.trim().length > 0) {
        bodyHtml = body.html;
      }
      if (typeof body.subject === "string" && body.subject.trim().length > 0) {
        bodySubject = body.subject;
      }
    } catch {
      return Response.json(
        { error: "Body JSON non valido", code: "INVALID_REQUEST" },
        { status: 400 },
      );
    }
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("newsletter_campaigns")
    .select("id, subject, html, recipient_count")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) {
    console.error("[RESUME] Campaign fetch error:", campaignError.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }
  if (!campaign) {
    return Response.json({ error: "Campagna non trovata", code: "NOT_FOUND" }, { status: 404 });
  }

  const subject = bodySubject ?? String(campaign.subject ?? "");
  const html = bodyHtml ?? (campaign.html ? String(campaign.html) : null);
  if (!html) {
    return Response.json(
      {
        error: "HTML mancante. Per le campagne legacy passa { html, subject? } nel body del POST.",
        code: "MISSING_HTML",
      },
      { status: 400 },
    );
  }

  // Persist the HTML/subject overrides so subsequent resumes don't need them.
  if (bodyHtml || bodySubject) {
    await supabase
      .from("newsletter_campaigns")
      .update({
        ...(bodyHtml ? { html: bodyHtml } : {}),
        ...(bodySubject ? { subject: bodySubject } : {}),
      })
      .eq("id", campaignId);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const result = await runCampaignSend({ campaignId, subject, html, siteUrl });

  console.log(
    `[RESUME] ${result.status}: ${result.totalDelivered}/${result.totalRecipients} delivered (run ${result.delivered} new, ${result.retryable} retryable, ${result.failed} permanent, ${result.orphaned} orphan)`,
  );

  return Response.json({
    campaignId: result.campaignId,
    status: result.status,
    sent: result.totalDelivered,
    total: result.totalRecipients,
    delivered: result.delivered,
    retryable: result.retryable,
    failed: result.failed,
    orphaned: result.orphaned,
    durationMs: result.durationMs,
  });
}
