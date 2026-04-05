import { describe, it, expect } from "vitest";
import { subscribeSchema, sendNewsletterSchema, scheduleNewsletterSchema } from "./validations";

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
