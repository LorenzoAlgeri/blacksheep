import { describe, it, expect } from "vitest";
import { renderConfirmationEmail } from "./confirmation";

const baseArgs = {
  confirmUrl: "https://blacksheep.community/api/confirm?token=abc123",
  unsubscribeUrl: "https://blacksheep.community/api/unsubscribe?token=abc123",
  tagline: "EVERY MONDAY",
  venue: "11 Clubroom · Corso Como · Milano",
  siteUrl: "https://blacksheep.community",
};

describe("renderConfirmationEmail", () => {
  it("returns a non-empty HTML string", () => {
    const html = renderConfirmationEmail(baseArgs);
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(500);
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it("includes the confirmUrl as href (URL not escaped)", () => {
    const html = renderConfirmationEmail(baseArgs);
    expect(html).toContain(baseArgs.confirmUrl);
  });

  it("includes the unsubscribeUrl as href", () => {
    const html = renderConfirmationEmail(baseArgs);
    expect(html).toContain(baseArgs.unsubscribeUrl);
  });

  it("includes the siteUrl in the privacy link", () => {
    const html = renderConfirmationEmail(baseArgs);
    expect(html).toContain(`${baseArgs.siteUrl}/privacy`);
  });

  it("includes the tagline (escaped to handle special chars safely)", () => {
    const html = renderConfirmationEmail(baseArgs);
    expect(html).toContain("EVERY MONDAY");
  });

  it("includes the venue (entities preserved when safe)", () => {
    const html = renderConfirmationEmail(baseArgs);
    // venue contains ' · ' (middle dot); should be present literal
    expect(html).toContain("Corso Como");
  });

  it("renders a personalized heading when name is provided", () => {
    const html = renderConfirmationEmail({ ...baseArgs, name: "Mario" });
    expect(html).toContain("MARIO, SEI DEI NOSTRI!");
  });

  it("renders the default heading when name is omitted", () => {
    const html = renderConfirmationEmail(baseArgs);
    expect(html).toContain("SEI DEI NOSTRI!");
    expect(html).not.toContain(", SEI DEI NOSTRI!");
  });

  it("renders the default heading when name is empty string", () => {
    const html = renderConfirmationEmail({ ...baseArgs, name: "" });
    expect(html).toContain("SEI DEI NOSTRI!");
    expect(html).not.toContain(", SEI DEI NOSTRI!");
  });

  it("escapes name to prevent XSS", () => {
    const html = renderConfirmationEmail({
      ...baseArgs,
      name: `<script>alert('x')</script>`,
    });
    // Name is uppercased before escaping, so the literal '<script>' substring
    // must not appear; angle brackets must be entity-encoded.
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(/<script>alert/i);
    expect(html).toContain("&lt;SCRIPT&gt;");
  });

  it("escapes tagline to prevent XSS", () => {
    const html = renderConfirmationEmail({
      ...baseArgs,
      tagline: `<img src=x onerror=alert(1)>`,
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("escapes venue to prevent XSS", () => {
    const html = renderConfirmationEmail({
      ...baseArgs,
      venue: `</td><script>foo</script>`,
    });
    expect(html).not.toContain("</td><script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("uppercases the name in the heading", () => {
    const html = renderConfirmationEmail({ ...baseArgs, name: "lorenzo" });
    // Heading is rendered uppercase; we generate the heading text uppercase
    expect(html).toContain("LORENZO, SEI DEI NOSTRI!");
  });
});
