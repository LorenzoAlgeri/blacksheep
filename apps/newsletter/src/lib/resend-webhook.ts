/**
 * Pure parsing/classification of Resend webhook events.
 *
 * We block a subscriber (status -> 'blocked') when Resend tells us a message
 * permanently failed or the recipient complained. Soft/transient bounces
 * (mailbox full, throttled, deferred) are NOT blocked — those can recover.
 *
 * Blocking (not deleting) is deliberate: it's reversible from the admin panel
 * and the newsletter sender excludes non-'confirmed' rows, so a blocked address
 * stops receiving mail and can no longer bounce.
 */

export type ResendWebhookAction = {
  type: string;
  /** Normalized (trimmed, lowercased) recipient emails from the event. */
  emails: string[];
  /** Whether the emails should be marked 'blocked'. */
  shouldBlock: boolean;
  /** Machine-readable reason: complaint | hard_bounce | soft_bounce | ignored. */
  reason: "complaint" | "hard_bounce" | "soft_bounce" | "ignored";
};

function normalizeEmails(to: unknown): string[] {
  const arr = Array.isArray(to) ? to : typeof to === "string" ? [to] : [];
  const seen = new Set<string>();
  for (const raw of arr) {
    if (typeof raw !== "string") continue;
    const email = raw.trim().toLowerCase();
    if (email.length > 0) seen.add(email);
  }
  return [...seen];
}

/**
 * A bounce is treated as "hard" (permanent) unless Resend explicitly classifies
 * it as transient/soft. When no classification is present we err on the side of
 * blocking to protect sender reputation — the action is reversible.
 */
function isHardBounce(bounce: unknown): boolean {
  if (!bounce || typeof bounce !== "object") return true;
  const b = bounce as Record<string, unknown>;
  const descriptor = `${b.type ?? ""} ${b.subType ?? ""}`.toLowerCase();
  if (/transient|soft|temporary|deferred|throttl|mailboxfull|mailbox full/.test(descriptor)) {
    return false;
  }
  return true;
}

export function parseResendWebhookEvent(payload: unknown): ResendWebhookAction {
  const p = (payload ?? {}) as Record<string, unknown>;
  const type = typeof p.type === "string" ? p.type : "";
  const data = (p.data ?? {}) as Record<string, unknown>;
  const emails = normalizeEmails(data.to);

  if (type === "email.complained") {
    return { type, emails, shouldBlock: emails.length > 0, reason: "complaint" };
  }

  if (type === "email.bounced") {
    const hard = isHardBounce(data.bounce);
    return {
      type,
      emails,
      shouldBlock: hard && emails.length > 0,
      reason: hard ? "hard_bounce" : "soft_bounce",
    };
  }

  return { type, emails: [], shouldBlock: false, reason: "ignored" };
}
