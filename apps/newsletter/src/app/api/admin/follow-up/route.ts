import { auth } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase";
import { adminFollowUpSchema } from "@/lib/validations";
import {
  buildFollowUpEmail,
  getFollowUpConstants,
  getFollowUpEligibility,
  type PendingSubscriber,
} from "@/lib/follow-up";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SEND_DELAY_MS = 250;
const MAX_OLDEST_COUNT = 50;

export async function POST(request: Request) {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (err) {
    console.error("[FOLLOW_UP] Supabase init error:", err);
    return Response.json(
      { error: "Configurazione database mancante", code: "CONFIG_ERROR" },
      { status: 500 },
    );
  }

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

  const parsed = adminFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { mode, subscriberIds = [], oldestCount = 1 } = parsed.data;
  const { maxAttempts, intervalHours } = getFollowUpConstants();

  const { data: pendingSubscribers, error: fetchError } = await supabase
    .from("subscribers")
    .select("id, email, name, token, status, created_at, follow_up_count, follow_up_last_sent_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (fetchError || !pendingSubscribers) {
    console.error("[FOLLOW_UP] Database fetch error:", fetchError?.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  const requested = pendingSubscribers as PendingSubscriber[];
  let candidates: PendingSubscriber[] = requested;

  if (mode === "selected") {
    const idSet = new Set(subscriberIds);
    candidates = requested.filter((subscriber) => idSet.has(subscriber.id));
  }

  if (mode === "oldest") {
    const safeCount = Math.min(Math.max(1, oldestCount), MAX_OLDEST_COUNT);
    candidates = requested.slice(0, safeCount);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const from = process.env.FOLLOW_UP_FROM_EMAIL ?? "BLACK SHEEP <the.blacksheep.night@gmail.com>";
  const replyTo = process.env.REPLY_TO_EMAIL ?? "the.blacksheep.night@gmail.com";

  const skipped: { id: string; email: string; reason: string; nextDueAt?: string }[] = [];
  const sent: { id: string; email: string }[] = [];
  let errors = 0;

  for (const subscriber of candidates) {
    const eligibility = getFollowUpEligibility(subscriber);
    if (!eligibility.eligible) {
      skipped.push({
        id: subscriber.id,
        email: subscriber.email,
        reason: eligibility.reason ?? "NOT_ELIGIBLE",
        nextDueAt: eligibility.nextDueAt,
      });
      continue;
    }

    let resend: ReturnType<typeof getResend>;
    try {
      resend = getResend();
    } catch (err) {
      console.error("[FOLLOW_UP] Resend init error:", err);
      return Response.json(
        { error: "Configurazione email mancante (RESEND_API_KEY)", code: "CONFIG_ERROR" },
        { status: 500 },
      );
    }

    const message = buildFollowUpEmail(subscriber, siteUrl);
    const sendResult = await resend.emails.send({
      from,
      replyTo,
      to: subscriber.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (sendResult.error) {
      errors += 1;
      console.error(`[FOLLOW_UP] Send error for ${subscriber.email}:`, sendResult.error);
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
      console.error(`[FOLLOW_UP] Update error for ${subscriber.email}:`, updateError.message);
      continue;
    }

    sent.push({ id: subscriber.id, email: subscriber.email });
    await wait(SEND_DELAY_MS);
  }

  return Response.json({
    mode,
    sent: sent.length,
    considered: candidates.length,
    skipped: skipped.length,
    errors,
    maxAttempts,
    intervalHours,
    sentSubscribers: sent,
    skippedSubscribers: skipped,
  });
}
