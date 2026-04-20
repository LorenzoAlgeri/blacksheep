const FOLLOW_UP_INTERVAL_HOURS = 48;
const FOLLOW_UP_MAX_ATTEMPTS = 3;

export type PendingSubscriber = {
  id: string;
  email: string;
  name: string | null;
  token: string;
  status: string;
  created_at: string | null;
  subscribed_at?: string | null;
  follow_up_count: number | null;
  follow_up_last_sent_at: string | null;
};

export type FollowUpEligibility = {
  eligible: boolean;
  reason?: "MAX_ATTEMPTS" | "WAIT_INTERVAL" | "NOT_PENDING";
  nextDueAt?: string;
};

function getSubscriptionDateIso(subscriber: PendingSubscriber): string | null {
  return subscriber.subscribed_at ?? subscriber.created_at ?? null;
}

function getSafeCount(value: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, value);
}

function addHours(isoDate: string, hours: number): string {
  const date = new Date(isoDate);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function getFollowUpEligibility(
  subscriber: PendingSubscriber,
  now: Date = new Date(),
): FollowUpEligibility {
  if (subscriber.status !== "pending") {
    return { eligible: false, reason: "NOT_PENDING" };
  }

  const count = getSafeCount(subscriber.follow_up_count);
  if (count >= FOLLOW_UP_MAX_ATTEMPTS) {
    return { eligible: false, reason: "MAX_ATTEMPTS" };
  }

  if (subscriber.follow_up_last_sent_at) {
    const nextDueAt = addHours(subscriber.follow_up_last_sent_at, FOLLOW_UP_INTERVAL_HOURS);
    if (new Date(nextDueAt).getTime() > now.getTime()) {
      return { eligible: false, reason: "WAIT_INTERVAL", nextDueAt };
    }
    return { eligible: true, nextDueAt };
  }

  const subscribedAt = getSubscriptionDateIso(subscriber);
  if (!subscribedAt) {
    return { eligible: true };
  }

  const firstDueAt = addHours(subscribedAt, FOLLOW_UP_INTERVAL_HOURS);
  if (new Date(firstDueAt).getTime() > now.getTime()) {
    return { eligible: false, reason: "WAIT_INTERVAL", nextDueAt: firstDueAt };
  }

  return { eligible: true, nextDueAt: firstDueAt };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

export function buildFollowUpEmail(subscriber: PendingSubscriber, siteUrl: string) {
  const safeName = subscriber.name?.trim() ? escapeHtml(subscriber.name.trim()) : null;
  const greet = safeName ? `Ciao ${safeName},` : "Ciao,";

  const confirmUrl = `${siteUrl}/api/confirm?token=${subscriber.token}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

  const subject = "Conferma la tua email per BLACK SHEEP";
  const text = [
    `${safeName ? `Ciao ${subscriber.name},` : "Ciao,"}`,
    "",
    "ti abbiamo riservato un posto nella mailing list BLACK SHEEP.",
    "Per attivarlo, conferma la tua email da questo link:",
    confirmUrl,
    "",
    "Se non desideri piu ricevere comunicazioni puoi disiscriverti:",
    unsubscribeUrl,
    "",
    "Ti chiediamo cortesemente di non rispondere a questa email, salvo richieste di assistenza.",
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.6;max-width:560px;margin:0 auto;padding:20px;">
    <p>${greet}</p>
    <p>ti abbiamo riservato un posto nella mailing list BLACK SHEEP.</p>
    <p>Per attivarlo, conferma la tua email da questo link:</p>
    <p><a href="${confirmUrl}">${confirmUrl}</a></p>
    <p>Se non desideri piu ricevere comunicazioni, puoi disiscriverti qui:<br><a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>
    <p>Ti chiediamo cortesemente di non rispondere a questa email, salvo richieste di assistenza.</p>
  </div>`;

  return { subject, text, html, confirmUrl, unsubscribeUrl };
}

export function getFollowUpConstants() {
  return {
    intervalHours: FOLLOW_UP_INTERVAL_HOURS,
    maxAttempts: FOLLOW_UP_MAX_ATTEMPTS,
  };
}
