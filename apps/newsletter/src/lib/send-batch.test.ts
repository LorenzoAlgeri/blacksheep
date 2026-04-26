import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_ATTEMPTS,
  sendCampaignBatch,
  type BatchSendOutcome,
  type CampaignStore,
  type MailSender,
  type PendingRecipient,
  type SubscriberRecord,
} from "@/lib/send-batch";

interface MarkSentCall {
  tokens: string[];
  sentAt: Date;
}

interface MarkFailedCall {
  failures: { token: string; error: string; nextAttempts: number; permanent: boolean }[];
}

interface MarkOrphanedCall {
  tokens: string[];
}

function buildStore(initial: {
  recipients: PendingRecipient[];
  subscribers: SubscriberRecord[];
  totalRecipients: number;
  totalDelivered?: number;
}) {
  // Mutable copy so the store mimics real DB transitions across loop iterations.
  let pending = [...initial.recipients];
  const subscribers = [...initial.subscribers];
  let totalDelivered = initial.totalDelivered ?? 0;

  const markSentCalls: MarkSentCall[] = [];
  const markFailedCalls: MarkFailedCall[] = [];
  const markOrphanedCalls: MarkOrphanedCall[] = [];

  const store: CampaignStore = {
    async fetchPending(_campaignId, limit) {
      return pending.slice(0, limit);
    },
    async fetchSubscribers(tokens) {
      return subscribers.filter((s) => tokens.includes(s.token));
    },
    async markSent(_campaignId, tokens, sentAt) {
      markSentCalls.push({ tokens: [...tokens], sentAt });
      pending = pending.filter((p) => !tokens.includes(p.subscriberToken));
      totalDelivered += tokens.length;
    },
    async markFailed(_campaignId, failures) {
      markFailedCalls.push({ failures: failures.map((f) => ({ ...f })) });
      const permanentTokens = new Set(failures.filter((f) => f.permanent).map((f) => f.token));
      // Permanent failures leave pending; transient failures bump attempts.
      pending = pending.map((p) => {
        const failure = failures.find((f) => f.token === p.subscriberToken);
        if (!failure) return p;
        if (failure.permanent) return p;
        return { ...p, attempts: failure.nextAttempts };
      });
      // Permanent failures must NOT come back through fetchPending; remove them.
      pending = pending.filter((p) => !permanentTokens.has(p.subscriberToken));
    },
    async markOrphaned(_campaignId, tokens) {
      markOrphanedCalls.push({ tokens: [...tokens] });
      pending = pending.filter((p) => !tokens.includes(p.subscriberToken));
    },
    async refreshCampaignAggregates() {
      return { totalRecipients: initial.totalRecipients, totalDelivered };
    },
  };

  return {
    store,
    markSentCalls,
    markFailedCalls,
    markOrphanedCalls,
    getPending: () => [...pending],
  };
}

function buildMailer(
  outcomes: ((batch: { to: string }[]) => BatchSendOutcome)[],
): MailSender & { calls: { to: string }[][] } {
  const calls: { to: string }[][] = [];
  let invocation = 0;
  return {
    calls,
    async sendBatch(payload, _idempotencyKey) {
      const minimal = payload.map((p) => ({ to: p.to }));
      calls.push(minimal);
      const handler = outcomes[invocation] ?? outcomes[outcomes.length - 1];
      invocation += 1;
      return handler(minimal);
    },
  };
}

const ALL_OK = (batch: { to: string }[]): BatchSendOutcome => ({
  successCount: batch.length,
  failedIndexes: [],
});

describe("sendCampaignBatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T10:00:00Z"));
  });

  it("returns status 'complete' immediately when there are no pending recipients", async () => {
    const { store } = buildStore({ recipients: [], subscribers: [], totalRecipients: 0 });
    const mailer = buildMailer([ALL_OK]);

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "x",
      html: "<p>hi {{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    expect(result.status).toBe("complete");
    expect(result.delivered).toBe(0);
    expect(mailer.calls).toHaveLength(0);
  });

  it("chunks 109 pending recipients into a 100 + 9 split", async () => {
    const recipients: PendingRecipient[] = Array.from({ length: 109 }, (_, i) => ({
      subscriberToken: `tok-${i}`,
      attempts: 0,
    }));
    const subscribers: SubscriberRecord[] = recipients.map((r, i) => ({
      token: r.subscriberToken,
      email: `user${i}@test.com`,
    }));

    const { store, markSentCalls } = buildStore({
      recipients,
      subscribers,
      totalRecipients: 109,
    });
    const mailer = buildMailer([ALL_OK]);

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "x",
      html: "<p>{{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    expect(mailer.calls).toHaveLength(2);
    expect(mailer.calls[0]).toHaveLength(100);
    expect(mailer.calls[1]).toHaveLength(9);
    expect(result.status).toBe("complete");
    expect(result.delivered).toBe(109);
    expect(markSentCalls.flatMap((c) => c.tokens)).toHaveLength(109);
  });

  it("only sends to pending recipients, skipping already-sent ones (idempotency via DB)", async () => {
    // Already-sent recipients are simply not in the pending list returned by the store.
    const recipients: PendingRecipient[] = [
      { subscriberToken: "tok-pending-1", attempts: 0 },
      { subscriberToken: "tok-pending-2", attempts: 0 },
    ];
    const subscribers: SubscriberRecord[] = [
      { token: "tok-pending-1", email: "a@test.com" },
      { token: "tok-pending-2", email: "b@test.com" },
    ];

    const { store, markSentCalls } = buildStore({
      recipients,
      subscribers,
      totalRecipients: 17, // 15 already sent (backfilled) + 2 pending
      totalDelivered: 15,
    });
    const mailer = buildMailer([ALL_OK]);

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "Ci sei dentro.",
      html: "<p>{{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    expect(mailer.calls).toHaveLength(1);
    expect(mailer.calls[0].map((p) => p.to).sort()).toEqual(["a@test.com", "b@test.com"]);
    expect(result.delivered).toBe(2);
    expect(result.totalDelivered).toBe(17);
    expect(result.totalRecipients).toBe(17);
    expect(result.status).toBe("complete");
    expect(markSentCalls).toHaveLength(1);
  });

  it("partitions per-recipient failures from the permissive batch response", async () => {
    const recipients: PendingRecipient[] = [
      { subscriberToken: "tok-a", attempts: 0 },
      { subscriberToken: "tok-b", attempts: 0 },
      { subscriberToken: "tok-c", attempts: 0 },
    ];
    const subscribers: SubscriberRecord[] = [
      { token: "tok-a", email: "a@test.com" },
      { token: "tok-b", email: "b@test.com" },
      { token: "tok-c", email: "c@test.com" },
    ];
    const { store, markSentCalls, markFailedCalls } = buildStore({
      recipients,
      subscribers,
      totalRecipients: 3,
    });

    const mailer = buildMailer([
      (batch) => ({
        successCount: batch.length - 1,
        failedIndexes: [{ index: 1, message: "invalid_to_address" }],
      }),
    ]);

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "x",
      html: "<p>{{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    expect(markSentCalls).toHaveLength(1);
    expect(markSentCalls[0].tokens.sort()).toEqual(["tok-a", "tok-c"]);

    expect(markFailedCalls).toHaveLength(1);
    expect(markFailedCalls[0].failures).toEqual([
      {
        token: "tok-b",
        error: "invalid_to_address",
        nextAttempts: 1,
        permanent: false,
      },
    ]);

    expect(result.delivered).toBe(2);
    expect(result.retryable).toBe(1);
    expect(result.failed).toBe(0);
    // A retryable failure leaves work for the resume endpoint, so the run
    // returns 'partial' even though we've drained the chunk. The DB row
    // stays pending with bumped attempts; the next run picks it up.
    expect(result.status).toBe("partial");
  });

  it("marks recipients permanently failed once attempts hit the cap", async () => {
    const recipients: PendingRecipient[] = [
      { subscriberToken: "tok-a", attempts: MAX_ATTEMPTS - 1 },
    ];
    const subscribers: SubscriberRecord[] = [{ token: "tok-a", email: "a@test.com" }];
    const { store, markFailedCalls } = buildStore({
      recipients,
      subscribers,
      totalRecipients: 1,
    });

    const mailer = buildMailer([
      () => ({
        successCount: 0,
        failedIndexes: [{ index: 0, message: "bounced" }],
      }),
    ]);

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "x",
      html: "<p>{{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    expect(markFailedCalls).toHaveLength(1);
    expect(markFailedCalls[0].failures[0].permanent).toBe(true);
    expect(markFailedCalls[0].failures[0].nextAttempts).toBe(MAX_ATTEMPTS);
    expect(result.failed).toBe(1);
    expect(result.retryable).toBe(0);
    expect(result.status).toBe("complete");
  });

  it("treats a fatal batch error as transient: marks attempts++, returns 'partial', and stops the loop", async () => {
    const recipients: PendingRecipient[] = Array.from({ length: 250 }, (_, i) => ({
      subscriberToken: `tok-${i}`,
      attempts: 0,
    }));
    const subscribers: SubscriberRecord[] = recipients.map((r, i) => ({
      token: r.subscriberToken,
      email: `u${i}@test.com`,
    }));
    const { store, markFailedCalls } = buildStore({
      recipients,
      subscribers,
      totalRecipients: 250,
    });

    const mailer = buildMailer([
      () => ({
        successCount: 0,
        failedIndexes: [],
        fatalError: { message: "rate_limit_exceeded" },
      }),
    ]);

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "x",
      html: "<p>{{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    // Only the first chunk should have been attempted; loop must abort on fatal error.
    expect(mailer.calls).toHaveLength(1);
    expect(markFailedCalls).toHaveLength(1);
    expect(markFailedCalls[0].failures.every((f) => !f.permanent)).toBe(true);
    expect(result.status).toBe("partial");
  });

  it("marks orphan recipients (subscriber row missing) and continues", async () => {
    const recipients: PendingRecipient[] = [
      { subscriberToken: "tok-orphan", attempts: 0 },
      { subscriberToken: "tok-active", attempts: 0 },
    ];
    const subscribers: SubscriberRecord[] = [{ token: "tok-active", email: "active@test.com" }];
    const { store, markOrphanedCalls, markSentCalls } = buildStore({
      recipients,
      subscribers,
      totalRecipients: 2,
    });
    const mailer = buildMailer([ALL_OK]);

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "x",
      html: "<p>{{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    expect(markOrphanedCalls).toEqual([{ tokens: ["tok-orphan"] }]);
    expect(markSentCalls[0].tokens).toEqual(["tok-active"]);
    expect(result.orphaned).toBe(1);
    expect(result.delivered).toBe(1);
    expect(result.status).toBe("complete");
  });

  it("returns 'partial' when the time budget is exhausted before all chunks are sent", async () => {
    const recipients: PendingRecipient[] = Array.from({ length: 300 }, (_, i) => ({
      subscriberToken: `tok-${i}`,
      attempts: 0,
    }));
    const subscribers: SubscriberRecord[] = recipients.map((r, i) => ({
      token: r.subscriberToken,
      email: `u${i}@test.com`,
    }));
    const { store, markSentCalls } = buildStore({
      recipients,
      subscribers,
      totalRecipients: 300,
    });
    const mailer = buildMailer([ALL_OK]);

    // Clock advances 30s per call so the 2nd chunk pushes us past a 50s budget.
    let tick = 0;
    const now = () => {
      const value = tick;
      tick += 30_000;
      return value;
    };

    const result = await sendCampaignBatch({
      campaignId: "c1",
      subject: "x",
      html: "<p>{{UNSUB}}</p>",
      siteUrl: "https://example.com",
      store,
      mailer,
      budgetMs: 50_000,
      now,
    });

    expect(mailer.calls.length).toBeLessThan(3);
    expect(markSentCalls.length).toBeLessThan(3);
    expect(result.status).toBe("partial");
    expect(result.delivered).toBeGreaterThan(0);
  });

  it("personalises {{UNSUB}} per recipient and preserves the campaign tracking pixel", async () => {
    const recipients: PendingRecipient[] = [
      { subscriberToken: "tok-1", attempts: 0 },
      { subscriberToken: "tok-2", attempts: 0 },
    ];
    const subscribers: SubscriberRecord[] = recipients.map((r) => ({
      token: r.subscriberToken,
      email: `${r.subscriberToken}@test.com`,
    }));
    const { store } = buildStore({ recipients, subscribers, totalRecipients: 2 });

    const captured: { to: string; html: string }[] = [];
    const mailer: MailSender = {
      async sendBatch(payload) {
        for (const p of payload) captured.push({ to: p.to, html: p.html });
        return { successCount: payload.length, failedIndexes: [] };
      },
    };

    await sendCampaignBatch({
      campaignId: "campaign-xyz",
      subject: "Hello",
      html: "<body>Hi {{UNSUB}}</body>",
      siteUrl: "https://example.com",
      store,
      mailer,
    });

    expect(captured).toHaveLength(2);
    for (const cap of captured) {
      const token = cap.to.split("@")[0];
      expect(cap.html).toContain(`token=${token}`);
      expect(cap.html).toContain("/api/newsletter/open");
      expect(cap.html).toContain("c=campaign-xyz");
      expect(cap.html).toContain(`t=${token}`);
    }
  });
});
