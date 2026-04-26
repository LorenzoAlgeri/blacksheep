import { getResend } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase";
import { buildListUnsubscribeHeaders } from "@/lib/unsubscribe-headers";

export const CHUNK_SIZE = 100;
export const DEFAULT_BUDGET_MS = 50_000;
export const MAX_ATTEMPTS = 3;

export type CampaignSendStatus = "complete" | "partial";

export interface PendingRecipient {
  subscriberToken: string;
  attempts: number;
}

export interface SubscriberRecord {
  token: string;
  email: string;
}

export interface RecipientFailure {
  token: string;
  error: string;
  nextAttempts: number;
  permanent: boolean;
}

export interface CampaignAggregates {
  totalRecipients: number;
  totalDelivered: number;
}

export interface CampaignStore {
  fetchPending(campaignId: string, limit: number): Promise<PendingRecipient[]>;
  fetchSubscribers(tokens: string[]): Promise<SubscriberRecord[]>;
  markSent(campaignId: string, tokens: string[], sentAt: Date): Promise<void>;
  markFailed(campaignId: string, failures: RecipientFailure[]): Promise<void>;
  markOrphaned(campaignId: string, tokens: string[]): Promise<void>;
  refreshCampaignAggregates(campaignId: string): Promise<CampaignAggregates>;
}

export interface BatchEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers: Record<string, string>;
}

export interface BatchSendOutcome {
  successCount: number;
  failedIndexes: { index: number; message: string }[];
  fatalError?: { message: string };
}

export interface MailSender {
  sendBatch(payload: BatchEmailPayload[], idempotencyKey: string): Promise<BatchSendOutcome>;
}

export interface SendCampaignBatchArgs {
  campaignId: string;
  subject: string;
  html: string;
  siteUrl: string;
  fromEmail?: string;
  replyTo?: string;
  budgetMs?: number;
  chunkSize?: number;
  store: CampaignStore;
  mailer: MailSender;
  now?: () => number;
}

export interface CampaignSendResult {
  campaignId: string;
  delivered: number;
  failed: number;
  retryable: number;
  orphaned: number;
  totalRecipients: number;
  totalDelivered: number;
  status: CampaignSendStatus;
  durationMs: number;
}

export async function sendCampaignBatch(args: SendCampaignBatchArgs): Promise<CampaignSendResult> {
  const clock = args.now ?? Date.now;
  const startedAt = clock();
  const budget = args.budgetMs ?? DEFAULT_BUDGET_MS;
  const chunkSize = args.chunkSize ?? CHUNK_SIZE;
  const fromEmail =
    args.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>";
  const replyTo = args.replyTo ?? process.env.REPLY_TO_EMAIL ?? undefined;
  const appBaseUrl = normalizeAppBaseUrl(args.siteUrl);

  let delivered = 0;
  let failed = 0;
  let retryable = 0;
  let orphaned = 0;
  let status: CampaignSendStatus = "complete";

  // Tokens we've already attempted in this run. A transient-failed recipient
  // bumps attempts but stays under MAX_ATTEMPTS, so fetchPending would keep
  // returning it. Excluding them here prevents tight-loop retries within the
  // same invocation; the next run (resume endpoint or daily cron) will pick
  // them up again.
  const touchedInThisRun = new Set<string>();

  while (true) {
    if (clock() - startedAt > budget) {
      status = "partial";
      break;
    }

    const pendingFromStore = await args.store.fetchPending(args.campaignId, chunkSize);
    const pending = pendingFromStore.filter((p) => !touchedInThisRun.has(p.subscriberToken));
    if (pending.length === 0) {
      // Either nothing is pending at all, or every pending row has already
      // been touched in this run (transient failures we won't retry now).
      // Returning 'complete' here is correct only when the store really has
      // nothing left; if some recipients still have attempts < MAX we mark
      // the run as 'partial' so the resume endpoint will pick them up.
      if (pendingFromStore.length > 0) status = "partial";
      break;
    }

    const tokens = pending.map((p) => p.subscriberToken);
    const subscribers = await args.store.fetchSubscribers(tokens);
    const subByToken = new Map(subscribers.map((s) => [s.token, s.email]));

    const orphanTokens = pending
      .filter((p) => !subByToken.has(p.subscriberToken))
      .map((p) => p.subscriberToken);
    if (orphanTokens.length > 0) {
      await args.store.markOrphaned(args.campaignId, orphanTokens);
      orphanTokens.forEach((t) => touchedInThisRun.add(t));
      orphaned += orphanTokens.length;
    }

    const sendable = pending.filter((p) => subByToken.has(p.subscriberToken));
    sendable.forEach((p) => touchedInThisRun.add(p.subscriberToken));
    if (sendable.length === 0) continue;

    const payload: BatchEmailPayload[] = sendable.map((p) =>
      buildEmail({
        to: subByToken.get(p.subscriberToken) as string,
        token: p.subscriberToken,
        campaignId: args.campaignId,
        subject: args.subject,
        html: args.html,
        appBaseUrl,
        fromEmail,
        replyTo,
      }),
    );

    const idempotencyKey = `campaign-${args.campaignId}-${sendable[0].subscriberToken}-${sendable.length}`;
    const outcome = await args.mailer.sendBatch(payload, idempotencyKey);

    if (outcome.fatalError) {
      const failures: RecipientFailure[] = sendable.map((p) => {
        const next = p.attempts + 1;
        return {
          token: p.subscriberToken,
          error: outcome.fatalError!.message,
          nextAttempts: next,
          permanent: next >= MAX_ATTEMPTS,
        };
      });
      await args.store.markFailed(args.campaignId, failures);
      failed += failures.filter((f) => f.permanent).length;
      retryable += failures.filter((f) => !f.permanent).length;
      // Don't keep banging the API on a fatal error — let the resume endpoint
      // (or the daily cron) try again later.
      status = "partial";
      break;
    }

    const failedByIndex = new Map(outcome.failedIndexes.map((f) => [f.index, f.message]));
    const successTokens: string[] = [];
    const failureRows: RecipientFailure[] = [];

    sendable.forEach((p, i) => {
      const errMsg = failedByIndex.get(i);
      if (errMsg) {
        const next = p.attempts + 1;
        failureRows.push({
          token: p.subscriberToken,
          error: errMsg,
          nextAttempts: next,
          permanent: next >= MAX_ATTEMPTS,
        });
      } else {
        successTokens.push(p.subscriberToken);
      }
    });

    if (successTokens.length > 0) {
      await args.store.markSent(args.campaignId, successTokens, new Date(clock()));
      delivered += successTokens.length;
    }
    if (failureRows.length > 0) {
      await args.store.markFailed(args.campaignId, failureRows);
      failed += failureRows.filter((f) => f.permanent).length;
      retryable += failureRows.filter((f) => !f.permanent).length;
    }
  }

  const aggregates = await args.store.refreshCampaignAggregates(args.campaignId);

  return {
    campaignId: args.campaignId,
    delivered,
    failed,
    retryable,
    orphaned,
    totalRecipients: aggregates.totalRecipients,
    totalDelivered: aggregates.totalDelivered,
    status,
    durationMs: clock() - startedAt,
  };
}

interface BuildEmailArgs {
  to: string;
  token: string;
  campaignId: string;
  subject: string;
  html: string;
  appBaseUrl: string;
  fromEmail: string;
  replyTo?: string;
}

function buildEmail(args: BuildEmailArgs): BatchEmailPayload {
  const unsubscribeUrl = `${args.appBaseUrl}/api/unsubscribe?token=${args.token}`;
  const unsubscribeLink = `<br><a href="${unsubscribeUrl}" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Disiscriviti</a> &middot; <a href="${args.appBaseUrl}/privacy" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Privacy Policy</a>`;
  const personalised = args.html.replaceAll("{{UNSUB}}", unsubscribeLink);
  const trackedHtml = injectOpenTrackingPixel(
    personalised,
    args.appBaseUrl,
    args.token,
    args.campaignId,
  );

  return {
    from: args.fromEmail,
    to: args.to,
    subject: args.subject,
    html: trackedHtml,
    replyTo: args.replyTo,
    headers: buildListUnsubscribeHeaders({
      unsubscribeUrl,
      mailtoAddress: args.replyTo ?? "the.blacksheep.night@gmail.com",
      mailtoSubjectToken: args.token,
    }),
  };
}

function injectOpenTrackingPixel(
  html: string,
  siteUrl: string,
  token: string,
  campaignId: string,
): string {
  const separator = siteUrl.includes("?") ? "&" : "?";
  const trackingUrl = `${siteUrl}/api/newsletter/open${separator}c=${encodeURIComponent(campaignId)}&t=${encodeURIComponent(token)}`;
  const pixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:block;border:0;outline:none;text-decoration:none;width:1px;height:1px;" />`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }

  return `${html}${pixel}`;
}

function normalizeAppBaseUrl(siteUrl: string): string {
  const trimmedSiteUrl = siteUrl.replace(/\/+$/, "");
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

  if (!basePath) return trimmedSiteUrl;
  if (trimmedSiteUrl.endsWith(basePath)) return trimmedSiteUrl;

  return `${trimmedSiteUrl}${basePath.startsWith("/") ? "" : "/"}${basePath}`;
}

// ============================================================
// Default adapters: bind the orchestrator to the real Supabase + Resend clients.
// ============================================================

type SupabaseClientLike = ReturnType<typeof getSupabase>;
type ResendClientLike = ReturnType<typeof getResend>;

export function createSupabaseCampaignStore(supabase: SupabaseClientLike): CampaignStore {
  return {
    async fetchPending(campaignId, limit) {
      const { data, error } = await supabase
        .from("newsletter_campaign_recipients")
        .select("subscriber_token, attempts")
        .eq("campaign_id", campaignId)
        .is("sent_at", null)
        .lt("attempts", MAX_ATTEMPTS)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw new Error(`fetchPending failed: ${error.message}`);
      return (data ?? []).map((row) => ({
        subscriberToken: String(row.subscriber_token),
        attempts: Number(row.attempts ?? 0),
      }));
    },

    async fetchSubscribers(tokens) {
      if (tokens.length === 0) return [];
      const { data, error } = await supabase
        .from("subscribers")
        .select("token, email")
        .in("token", tokens)
        .eq("status", "confirmed");
      if (error) throw new Error(`fetchSubscribers failed: ${error.message}`);
      return (data ?? []).map((row) => ({
        token: String(row.token),
        email: String(row.email),
      }));
    },

    async markSent(campaignId, tokens, sentAt) {
      if (tokens.length === 0) return;
      const { error } = await supabase
        .from("newsletter_campaign_recipients")
        .update({ sent_at: sentAt.toISOString(), last_error: null })
        .eq("campaign_id", campaignId)
        .in("subscriber_token", tokens);
      if (error) throw new Error(`markSent failed: ${error.message}`);
    },

    async markFailed(campaignId, failures) {
      if (failures.length === 0) return;
      // Supabase does not support per-row updates with different values in a
      // single call without a stored procedure, so we issue one update per
      // unique nextAttempts value. With MAX_ATTEMPTS = 3 this is at most 3
      // round-trips per chunk.
      const buckets = new Map<number, { tokens: string[]; error: string; permanent: boolean }>();
      for (const failure of failures) {
        const bucket = buckets.get(failure.nextAttempts) ?? {
          tokens: [],
          error: failure.error,
          permanent: failure.permanent,
        };
        bucket.tokens.push(failure.token);
        // Different errors collapse to the latest one; good enough for an
        // operator dashboard, and the ones we care about (rate_limit,
        // bounced) are usually uniform within a chunk anyway.
        bucket.error = failure.error;
        bucket.permanent = failure.permanent;
        buckets.set(failure.nextAttempts, bucket);
      }

      for (const [nextAttempts, bucket] of buckets) {
        const update: Record<string, unknown> = {
          attempts: nextAttempts,
          last_error: bucket.error,
        };
        if (bucket.permanent) update.failed_at = new Date().toISOString();

        const { error } = await supabase
          .from("newsletter_campaign_recipients")
          .update(update)
          .eq("campaign_id", campaignId)
          .in("subscriber_token", bucket.tokens);
        if (error) throw new Error(`markFailed failed: ${error.message}`);
      }
    },

    async markOrphaned(campaignId, tokens) {
      if (tokens.length === 0) return;
      const { error } = await supabase
        .from("newsletter_campaign_recipients")
        .update({
          attempts: MAX_ATTEMPTS,
          failed_at: new Date().toISOString(),
          last_error: "subscriber_unavailable",
        })
        .eq("campaign_id", campaignId)
        .in("subscriber_token", tokens);
      if (error) throw new Error(`markOrphaned failed: ${error.message}`);
    },

    async refreshCampaignAggregates(campaignId) {
      const { data: campaign, error: campaignError } = await supabase
        .from("newsletter_campaigns")
        .select("recipient_count")
        .eq("id", campaignId)
        .single();
      if (campaignError) throw new Error(`campaign fetch failed: ${campaignError.message}`);

      const { count: deliveredCount, error: countError } = await supabase
        .from("newsletter_campaign_recipients")
        .select("subscriber_token", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .not("sent_at", "is", null);
      if (countError) throw new Error(`delivered count failed: ${countError.message}`);

      const totalDelivered = Number(deliveredCount ?? 0);
      const totalRecipients = Number(campaign?.recipient_count ?? 0);

      // Best-effort sync of the campaign's denormalised sent_count column so
      // the admin UI shows the right number even before the campaign is
      // fully delivered.
      await supabase
        .from("newsletter_campaigns")
        .update({ sent_count: totalDelivered })
        .eq("id", campaignId);

      return { totalRecipients, totalDelivered };
    },
  };
}

export function createResendMailSender(resend: ResendClientLike): MailSender {
  return {
    async sendBatch(payload, idempotencyKey) {
      try {
        const response = await resend.batch.send(payload, {
          batchValidation: "permissive",
          idempotencyKey,
        });
        if (response.error) {
          return {
            successCount: 0,
            failedIndexes: [],
            fatalError: { message: response.error.message ?? "unknown_resend_error" },
          };
        }
        const data = response.data;
        const errors = (data && "errors" in data ? (data.errors ?? []) : []) as {
          index: number;
          message: string;
        }[];
        const successCount = (data?.data?.length ?? payload.length) - errors.length;
        return {
          successCount,
          failedIndexes: errors.map((e) => ({ index: e.index, message: e.message })),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown_resend_error";
        return { successCount: 0, failedIndexes: [], fatalError: { message } };
      }
    },
  };
}

/**
 * Convenience wrapper used by API routes. Wires the orchestrator to the real
 * Supabase + Resend clients with default chunk size and budget.
 */
export async function runCampaignSend(params: {
  campaignId: string;
  subject: string;
  html: string;
  siteUrl: string;
  budgetMs?: number;
}): Promise<CampaignSendResult> {
  return sendCampaignBatch({
    campaignId: params.campaignId,
    subject: params.subject,
    html: params.html,
    siteUrl: params.siteUrl,
    budgetMs: params.budgetMs,
    store: createSupabaseCampaignStore(getSupabase()),
    mailer: createResendMailSender(getResend()),
  });
}
