import { timingSafeEqual } from "crypto";
import { getResend } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase";
import {
  buildFollowUpEmail,
  getFollowUpEligibility,
  type PendingSubscriber,
} from "@/lib/follow-up";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SEND_DELAY_MS = 250;

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
    console.warn("[CRON] Unauthorized access to send-followups");
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: pendingSubscribers, error } = await supabase
    .from("subscribers")
    .select(
      "id, email, name, token, status, created_at, subscribed_at, follow_up_count, follow_up_last_sent_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error || !pendingSubscribers) {
    console.error("[CRON] Follow-up fetch error:", error?.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const from = process.env.FOLLOW_UP_FROM_EMAIL ?? "BLACK SHEEP <the.blacksheep.night@gmail.com>";
  const replyTo = process.env.REPLY_TO_EMAIL ?? "the.blacksheep.night@gmail.com";

  const sent: string[] = [];
  const skipped: { email: string; reason: string }[] = [];
  let errors = 0;

  for (const subscriber of pendingSubscribers as PendingSubscriber[]) {
    const eligibility = getFollowUpEligibility(subscriber);
    if (!eligibility.eligible) {
      skipped.push({ email: subscriber.email, reason: eligibility.reason ?? "NOT_ELIGIBLE" });
      continue;
    }

    const message = buildFollowUpEmail(subscriber, siteUrl);
    const sendResult = await getResend().emails.send({
      from,
      replyTo,
      to: subscriber.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: {
        "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
      },
    });

    if (sendResult.error) {
      errors += 1;
      console.error(`[CRON] Follow-up send error for ${subscriber.email}:`, sendResult.error);
      continue;
    }

    const nextCount = Math.max(0, subscriber.follow_up_count ?? 0) + 1;
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("subscribers")
      .update({ follow_up_count: nextCount, follow_up_last_sent_at: nowIso })
      .eq("id", subscriber.id);

    if (updateError) {
      errors += 1;
      console.error(`[CRON] Follow-up update error for ${subscriber.email}:`, updateError.message);
      continue;
    }

    sent.push(subscriber.email);
    await wait(SEND_DELAY_MS);
  }

  return Response.json({
    processed: pendingSubscribers.length,
    sent: sent.length,
    skipped: skipped.length,
    errors,
    sentEmails: sent,
    skippedEmails: skipped,
  });
}
