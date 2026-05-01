import { describe, it, expect } from "vitest";
import { renderEventRegistrationEmail } from "./event-registration";

const baseArgs = {
  eventTitle: "BLACK SHEEP — Monday Club Night",
  eventDate: new Date("2026-05-15T21:00:00+02:00"),
  eventVenue: "11 Clubroom — Corso Como, Milano",
  unsubscribeUrl: "https://blacksheep.community/api/unsubscribe?token=abc",
  siteUrl: "https://blacksheep.community",
};

describe("renderEventRegistrationEmail", () => {
  it("returns a non-empty HTML string", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(500);
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it("includes the eventTitle (escaped)", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    expect(html).toContain(baseArgs.eventTitle);
  });

  it("includes the eventVenue", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    expect(html).toContain("Corso Como");
  });

  it("includes the unsubscribeUrl", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    expect(html).toContain(baseArgs.unsubscribeUrl);
  });

  it("includes eventDescription when provided", () => {
    const html = renderEventRegistrationEmail({
      ...baseArgs,
      eventDescription: "Lista ingresso fino a mezzanotte. Dress: dark/streetwear.",
    });
    expect(html).toContain("Dress: dark");
  });

  it("omits description block when eventDescription is undefined", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    expect(html).not.toContain("data-event-description");
  });

  it("omits description block when eventDescription is null", () => {
    const html = renderEventRegistrationEmail({ ...baseArgs, eventDescription: null });
    expect(html).not.toContain("data-event-description");
  });

  it("formats eventDate from Date object in it-IT locale", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    // 15 May 2026 in Italian: "15 mag" or "15 maggio" depending on style.
    // Implementation choice: short form (e.g. "15 mag 2026"). Either way,
    // year and day must be present.
    expect(html).toMatch(/15.*mag/i);
    expect(html).toContain("2026");
  });

  it("formats eventDate from ISO string equivalently", () => {
    const fromIso = renderEventRegistrationEmail({
      ...baseArgs,
      eventDate: "2026-05-15T21:00:00+02:00",
    });
    const fromDate = renderEventRegistrationEmail({
      ...baseArgs,
      eventDate: new Date("2026-05-15T21:00:00+02:00"),
    });
    // Both must produce the same date snippet
    const dateMatchIso = fromIso.match(/\d{1,2}.*?2026/);
    const dateMatchDate = fromDate.match(/\d{1,2}.*?2026/);
    expect(dateMatchIso?.[0]).toBe(dateMatchDate?.[0]);
  });

  it("renders personalized heading when name is provided", () => {
    const html = renderEventRegistrationEmail({ ...baseArgs, name: "Mario" });
    expect(html).toContain("MARIO, SEI IN LISTA");
  });

  it("renders default heading when name is omitted", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    expect(html).toContain("SEI IN LISTA");
    expect(html).not.toContain(", SEI IN LISTA");
  });

  it("escapes name to prevent XSS", () => {
    const html = renderEventRegistrationEmail({
      ...baseArgs,
      name: `<script>alert('x')</script>`,
    });
    expect(html).not.toContain("<script>alert('x')</script>");
    expect(html).toContain("&lt;SCRIPT&gt;");
  });

  it("escapes eventTitle to prevent XSS", () => {
    const html = renderEventRegistrationEmail({
      ...baseArgs,
      eventTitle: `<img onerror=alert(1)>`,
    });
    expect(html).not.toContain("<img onerror=");
    expect(html).toContain("&lt;img");
  });

  it("escapes eventVenue to prevent XSS", () => {
    const html = renderEventRegistrationEmail({
      ...baseArgs,
      eventVenue: `</td><script>foo</script>`,
    });
    expect(html).not.toContain("</td><script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes eventDescription to prevent XSS", () => {
    const html = renderEventRegistrationEmail({
      ...baseArgs,
      eventDescription: `<a href="javascript:alert(1)">click</a>`,
    });
    expect(html).not.toContain(`href="javascript:`);
    expect(html).toContain("&lt;a");
  });

  it("includes privacy link via siteUrl", () => {
    const html = renderEventRegistrationEmail(baseArgs);
    expect(html).toContain(`${baseArgs.siteUrl}/privacy`);
  });
});
