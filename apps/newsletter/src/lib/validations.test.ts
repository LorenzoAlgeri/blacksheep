import { describe, it, expect } from "vitest";
import {
  subscribeSchema,
  sendNewsletterSchema,
  scheduleNewsletterSchema,
  eventRegisterSchema,
  resendConfirmationSchema,
  contactHelpSchema,
  adminEventSchema,
} from "./validations";

describe("subscribeSchema", () => {
  it("accepts a valid email", () => {
    const result = subscribeSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = subscribeSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty email", () => {
    const result = subscribeSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects email with only spaces", () => {
    const result = subscribeSchema.safeParse({ email: "   " });
    expect(result.success).toBe(false);
  });

  it("accepts email regardless of case", () => {
    const result = subscribeSchema.safeParse({ email: "User@Example.COM" });
    expect(result.success).toBe(true);
  });

  it("accepts email with optional name", () => {
    const result = subscribeSchema.safeParse({
      email: "user@example.com",
      name: "Lorenzo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Lorenzo");
    }
  });

  it("rejects name longer than 100 characters", () => {
    const result = subscribeSchema.safeParse({
      email: "user@example.com",
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("allows honeypot field (website) to be empty", () => {
    const result = subscribeSchema.safeParse({
      email: "user@example.com",
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("allows honeypot field (website) with value for schema (checked in route)", () => {
    const result = subscribeSchema.safeParse({
      email: "user@example.com",
      website: "http://spam.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("sendNewsletterSchema", () => {
  it("accepts valid subject and html", () => {
    const result = sendNewsletterSchema.safeParse({
      subject: "Newsletter #1",
      html: "<p>Content</p>",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty subject", () => {
    const result = sendNewsletterSchema.safeParse({
      subject: "",
      html: "<p>Content</p>",
    });
    expect(result.success).toBe(false);
  });

  it("rejects subject longer than 200 chars", () => {
    const result = sendNewsletterSchema.safeParse({
      subject: "a".repeat(201),
      html: "<p>Content</p>",
    });
    expect(result.success).toBe(false);
  });

  it("accepts single-recipient mode with valid email", () => {
    const result = sendNewsletterSchema.safeParse({
      subject: "Newsletter #1",
      html: "<p>Content</p>",
      deliveryMode: "single",
      targetEmail: "the.blacksheep.night@gmail.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects single-recipient mode without targetEmail", () => {
    const result = sendNewsletterSchema.safeParse({
      subject: "Newsletter #1",
      html: "<p>Content</p>",
      deliveryMode: "single",
    });
    expect(result.success).toBe(false);
  });

  it("rejects single-recipient mode with invalid targetEmail", () => {
    const result = sendNewsletterSchema.safeParse({
      subject: "Newsletter #1",
      html: "<p>Content</p>",
      deliveryMode: "single",
      targetEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("scheduleNewsletterSchema", () => {
  it("accepts valid data with ISO date", () => {
    const result = scheduleNewsletterSchema.safeParse({
      subject: "Scheduled",
      html: "<p>Content</p>",
      scheduledAt: "2026-05-01T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date string", () => {
    const result = scheduleNewsletterSchema.safeParse({
      subject: "Scheduled",
      html: "<p>Content</p>",
      scheduledAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("eventRegisterSchema", () => {
  // Zod v4 z.uuid() validates RFC 4122 v4 format strictly:
  // 3rd group must start with '4', 4th group with 8/9/a/b.
  const validUuid = "11111111-1111-4111-9111-111111111111";

  it("accepts valid input with matching email and confirmation", () => {
    const result = eventRegisterSchema.safeParse({
      eventId: validUuid,
      email: "user@example.com",
      emailConfirmation: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts case-insensitive email match", () => {
    const result = eventRegisterSchema.safeParse({
      eventId: validUuid,
      email: "User@Example.COM",
      emailConfirmation: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when email and confirmation differ", () => {
    const result = eventRegisterSchema.safeParse({
      eventId: validUuid,
      email: "user@example.com",
      emailConfirmation: "other@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatch = result.error.issues.find((i) => i.path[0] === "emailConfirmation");
      expect(mismatch).toBeDefined();
    }
  });

  it("rejects when eventId is not a UUID", () => {
    const result = eventRegisterSchema.safeParse({
      eventId: "not-a-uuid",
      email: "user@example.com",
      emailConfirmation: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when email is missing", () => {
    const result = eventRegisterSchema.safeParse({
      eventId: validUuid,
      emailConfirmation: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty honeypot website field", () => {
    const result = eventRegisterSchema.safeParse({
      eventId: validUuid,
      email: "user@example.com",
      emailConfirmation: "user@example.com",
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts truthy honeypot value at schema level (bot detection happens in route)", () => {
    const result = eventRegisterSchema.safeParse({
      eventId: validUuid,
      email: "user@example.com",
      emailConfirmation: "user@example.com",
      website: "http://spam.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("resendConfirmationSchema", () => {
  it("accepts a valid email", () => {
    const result = resendConfirmationSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = resendConfirmationSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("contactHelpSchema", () => {
  const baseInput = {
    email: "user@example.com",
    phone: "+39 333 1234567",
    name: "Mario Rossi",
  };

  it("accepts all required fields valid", () => {
    const result = contactHelpSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("accepts optional message", () => {
    const result = contactHelpSchema.safeParse({
      ...baseInput,
      message: "Aiuto con la mia iscrizione",
    });
    expect(result.success).toBe(true);
  });

  it("accepts when message is omitted", () => {
    const result = contactHelpSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("rejects phone shorter than 5 chars", () => {
    const result = contactHelpSchema.safeParse({ ...baseInput, phone: "1234" });
    expect(result.success).toBe(false);
  });

  it("rejects phone longer than 30 chars", () => {
    const result = contactHelpSchema.safeParse({ ...baseInput, phone: "1".repeat(31) });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = contactHelpSchema.safeParse({ ...baseInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = contactHelpSchema.safeParse({ ...baseInput, name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects message longer than 2000 chars", () => {
    const result = contactHelpSchema.safeParse({
      ...baseInput,
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = contactHelpSchema.safeParse({ ...baseInput, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts honeypot website field (bot detection in route)", () => {
    const result = contactHelpSchema.safeParse({ ...baseInput, website: "" });
    expect(result.success).toBe(true);
  });
});

describe("adminEventSchema", () => {
  const baseInput = {
    slug: "monday-club-night-may",
    title: "BLACK SHEEP — Monday Club Night",
    event_date: "2026-05-15T20:00:00Z",
    venue: "11 Clubroom — Corso Como, Milano",
  };

  it("accepts valid lowercase-with-dashes slug", () => {
    const result = adminEventSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("rejects slug with uppercase characters", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, slug: "Monday-Club" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with underscore", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, slug: "monday_club" });
    expect(result.success).toBe(false);
  });

  it("rejects slug shorter than 3 chars", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, slug: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects slug longer than 80 chars", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, slug: "a".repeat(81) });
    expect(result.success).toBe(false);
  });

  it("accepts valid ISO datetime for event_date", () => {
    const result = adminEventSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("rejects event_date in invalid format", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, event_date: "15-05-2026" });
    expect(result.success).toBe(false);
  });

  it("accepts capacity as positive integer", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, capacity: 150 });
    expect(result.success).toBe(true);
  });

  it("accepts capacity as null", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, capacity: null });
    expect(result.success).toBe(true);
  });

  it("accepts capacity omitted", () => {
    const result = adminEventSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("rejects capacity 0 or negative", () => {
    const zero = adminEventSchema.safeParse({ ...baseInput, capacity: 0 });
    expect(zero.success).toBe(false);
    const negative = adminEventSchema.safeParse({ ...baseInput, capacity: -1 });
    expect(negative.success).toBe(false);
  });

  it("defaults status to 'draft' when omitted", () => {
    const result = adminEventSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("draft");
  });

  it("accepts status 'published'", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, status: "published" });
    expect(result.success).toBe(true);
  });

  it("accepts status 'archived'", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, status: "archived" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status value", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, status: "live" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 200 chars", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects venue longer than 200 chars", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, venue: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 5000 chars", () => {
    const result = adminEventSchema.safeParse({
      ...baseInput,
      description: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description as null", () => {
    const result = adminEventSchema.safeParse({ ...baseInput, description: null });
    expect(result.success).toBe(true);
  });
});
