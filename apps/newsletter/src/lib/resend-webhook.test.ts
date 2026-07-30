import { describe, it, expect } from "vitest";
import { parseResendWebhookEvent } from "./resend-webhook";

describe("parseResendWebhookEvent", () => {
  it("blocks on a permanent (hard) bounce", () => {
    const action = parseResendWebhookEvent({
      type: "email.bounced",
      data: { to: ["Dead@Example.com"], bounce: { type: "Permanent", subType: "General" } },
    });
    expect(action.shouldBlock).toBe(true);
    expect(action.reason).toBe("hard_bounce");
    expect(action.emails).toEqual(["dead@example.com"]);
  });

  it("does NOT block on a transient (soft) bounce", () => {
    const action = parseResendWebhookEvent({
      type: "email.bounced",
      data: { to: ["busy@example.com"], bounce: { type: "Transient", subType: "MailboxFull" } },
    });
    expect(action.shouldBlock).toBe(false);
    expect(action.reason).toBe("soft_bounce");
  });

  it("treats a bounce without classification as hard (reversible, protects reputation)", () => {
    const action = parseResendWebhookEvent({
      type: "email.bounced",
      data: { to: ["unknown@example.com"] },
    });
    expect(action.shouldBlock).toBe(true);
    expect(action.reason).toBe("hard_bounce");
  });

  it("blocks on a spam complaint", () => {
    const action = parseResendWebhookEvent({
      type: "email.complained",
      data: { to: ["angry@example.com"] },
    });
    expect(action.shouldBlock).toBe(true);
    expect(action.reason).toBe("complaint");
  });

  it("ignores unrelated events (delivered, sent, opened)", () => {
    for (const type of ["email.delivered", "email.sent", "email.opened"]) {
      const action = parseResendWebhookEvent({ type, data: { to: ["x@example.com"] } });
      expect(action.shouldBlock).toBe(false);
      expect(action.reason).toBe("ignored");
      expect(action.emails).toEqual([]);
    }
  });

  it("normalizes recipients: string form, casing, dedupe, whitespace", () => {
    const action = parseResendWebhookEvent({
      type: "email.complained",
      data: { to: " A@Example.com " },
    });
    expect(action.emails).toEqual(["a@example.com"]);
  });

  it("dedupes repeated recipients", () => {
    const action = parseResendWebhookEvent({
      type: "email.bounced",
      data: { to: ["dup@example.com", "DUP@example.com"], bounce: { type: "Permanent" } },
    });
    expect(action.emails).toEqual(["dup@example.com"]);
  });

  it("does not block when there are no recipients", () => {
    const action = parseResendWebhookEvent({ type: "email.bounced", data: { bounce: {} } });
    expect(action.emails).toEqual([]);
    expect(action.shouldBlock).toBe(false);
  });

  it("is defensive against malformed payloads", () => {
    expect(parseResendWebhookEvent(null).shouldBlock).toBe(false);
    expect(parseResendWebhookEvent({}).shouldBlock).toBe(false);
    expect(parseResendWebhookEvent({ type: 123 }).reason).toBe("ignored");
  });
});
