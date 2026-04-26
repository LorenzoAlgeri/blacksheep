import { auth } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase";
import { sendNewsletterSchema } from "@/lib/validations";
import { runCampaignSend } from "@/lib/send-batch";
import { buildListUnsubscribeHeaders } from "@/lib/unsubscribe-headers";

// Vercel Hobby caps serverless execution at 60s. The campaign send loop is
// budget-aware (see DEFAULT_BUDGET_MS in send-batch.ts) and stops cleanly
// before this hard limit; remaining recipients drain via the resume endpoint
// or the daily cron.
export const maxDuration = 60;

function normalizeAppBaseUrl(siteUrl: string): string {
  const trimmedSiteUrl = siteUrl.replace(/\/+$/, "");
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

  if (!basePath) return trimmedSiteUrl;
  if (trimmedSiteUrl.endsWith(basePath)) return trimmedSiteUrl;

  return `${trimmedSiteUrl}${basePath.startsWith("/") ? "" : "/"}${basePath}`;
}

function extractEmailAddress(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim() || null;
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Richiesta non valida", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }
  const parsed = sendNewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { subject, html, deliveryMode, targetEmail } = parsed.data;

  if (deliveryMode === "single") {
    if (!targetEmail) {
      return Response.json(
        { error: "Email destinatario mancante", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>";
    const replyTo = process.env.REPLY_TO_EMAIL ?? undefined;
    const normalizedTargetEmail = targetEmail.trim().toLowerCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.blacksheep-community.com";
    const appBaseUrl = normalizeAppBaseUrl(siteUrl);

    const { data: singleSubscriber } = await supabase
      .from("subscribers")
      .select("token")
      .ilike("email", normalizedTargetEmail)
      .maybeSingle();

    const subscriberToken = singleSubscriber?.token ? String(singleSubscriber.token) : null;
    const unsubscribeUrl = subscriberToken
      ? `${appBaseUrl}/api/unsubscribe?token=${subscriberToken}`
      : null;
    const unsubscribeLink = unsubscribeUrl
      ? `<br><a href="${unsubscribeUrl}" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Disiscriviti</a> &middot; <a href="${appBaseUrl}/privacy" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Privacy Policy</a>`
      : "";
    const htmlWithUnsubPlaceholder = html.replaceAll("{{UNSUB}}", unsubscribeLink);

    const unsubscribeHeaders = subscriberToken
      ? buildListUnsubscribeHeaders({
          unsubscribeUrl: `${appBaseUrl}/api/unsubscribe?token=${subscriberToken}`,
          mailtoAddress:
            extractEmailAddress(replyTo) ??
            extractEmailAddress(fromEmail) ??
            "the.blacksheep.night@gmail.com",
          mailtoSubjectToken: subscriberToken,
        })
      : undefined;

    const { error: emailError } = await getResend().emails.send({
      from: fromEmail,
      replyTo,
      to: normalizedTargetEmail,
      subject,
      html: htmlWithUnsubPlaceholder,
      headers: unsubscribeHeaders,
    });

    if (emailError) {
      console.error("[SEND] Single recipient send error:", emailError);
      return Response.json({ error: "Errore invio email", code: "EMAIL_ERROR" }, { status: 502 });
    }

    return Response.json({ sent: 1, total: 1, target: targetEmail, mode: "single" });
  }

  const { data: subscribers, error: dbError } = await supabase
    .from("subscribers")
    .select("email, token")
    .eq("status", "confirmed");

  if (dbError || !subscribers) {
    console.error("[SEND] Database error fetching subscribers:", dbError?.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json(
      { error: "Nessun iscritto confermato", code: "NO_SUBSCRIBERS" },
      { status: 400 },
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("newsletter_campaigns")
    .insert({
      subject,
      source: "manual",
      recipient_count: subscribers.length,
      html,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    console.error("[SEND] Campaign creation error:", campaignError?.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  const recipientsPayload = subscribers.map((subscriber) => ({
    campaign_id: campaign.id,
    subscriber_token: subscriber.token,
  }));

  const { error: recipientsError } = await supabase
    .from("newsletter_campaign_recipients")
    .insert(recipientsPayload);

  if (recipientsError) {
    console.error("[SEND] Campaign recipients insert error:", recipientsError.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  console.log(`[SEND] Sending newsletter "${subject}" to ${subscribers.length} subscribers`);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const result = await runCampaignSend({
    campaignId: campaign.id,
    subject,
    html,
    siteUrl,
  });

  // sent_at marks the campaign as "delivery started"; the actual aggregate
  // sent_count is kept fresh by runCampaignSend on every run.
  await supabase
    .from("newsletter_campaigns")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", campaign.id)
    .is("sent_at", null);

  console.log(
    `[SEND] ${result.status}: ${result.totalDelivered}/${result.totalRecipients} delivered (run ${result.delivered} new, ${result.retryable} retryable, ${result.failed} permanent, ${result.orphaned} orphan)`,
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
