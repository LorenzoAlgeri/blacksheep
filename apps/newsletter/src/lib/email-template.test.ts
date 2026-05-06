import { describe, it, expect } from "vitest";
import { buildEmailHtml, PALETTE_PRESETS } from "./email-template";

// Minimal valid template data used as a base for all tests.
const BASE: Parameters<typeof buildEmailHtml>[0] = {
  title: "Test newsletter",
  body: "Ciao!",
  showPhoto: false,
  photoUrl: "",
  showEvents: false,
  events: [],
  showCta: false,
  ctaText: "ENTRA",
  ctaLink: "https://blacksheep.community",
  showEventCta: false,
  eventCtaUrl: undefined,
  eventCtaTitle: undefined,
  unsubscribeUrl: "https://blacksheep.community/api/unsubscribe?token=abc",
  palette: PALETTE_PRESETS[0].palette,
};

// ---------------------------------------------------------------------------
// SEC-MED-06: eventCtaUrl protocol allowlist
// Accepted: http: https: only.
// Rejected: javascript:, data:, mailto:, ftp:, malformed URLs.
// ---------------------------------------------------------------------------
describe("buildEmailHtml — eventCtaUrl protocol validation [SEC-MED-06]", () => {
  function ctaHtml(eventCtaUrl: string, title = "ISCRIVITI") {
    return buildEmailHtml({
      ...BASE,
      showEventCta: true,
      eventCtaUrl,
      eventCtaTitle: title,
    });
  }

  // --- Accepted protocols ---

  it("renders the event CTA block for a valid https:// URL", () => {
    const html = ctaHtml(
      "https://blacksheep.community/newsletter/api/events/register-from-email?token={{TOKEN}}&event_slug=monday",
    );
    expect(html).toContain("ISCRIVITI");
    expect(html).toContain("https://blacksheep.community");
  });

  it("renders the event CTA block for a valid http://localhost URL (dev)", () => {
    const html = ctaHtml(
      "http://localhost:3000/newsletter/api/events/register-from-email?token={{TOKEN}}&event_slug=test",
    );
    expect(html).toContain("ISCRIVITI");
    expect(html).toContain("http://localhost:3000");
  });

  // --- Rejected protocols ---

  it("rejects a javascript: URL — omits the event CTA block entirely", () => {
    const html = ctaHtml("javascript:alert(document.cookie)");
    expect(html).not.toContain("javascript:");
    // The CTA button label must NOT appear when the URL is invalid.
    expect(html).not.toContain("ISCRIVITI");
  });

  it("rejects a data: URL — omits the event CTA block entirely", () => {
    const html = ctaHtml("data:text/html,<script>alert(1)</script>");
    expect(html).not.toContain("data:");
    expect(html).not.toContain("ISCRIVITI");
  });

  it("rejects a mailto: URL — omits the event CTA block entirely", () => {
    const html = ctaHtml("mailto:victim@example.com");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("ISCRIVITI");
  });

  it("rejects an ftp: URL — omits the event CTA block entirely", () => {
    const html = ctaHtml("ftp://files.example.com/path");
    expect(html).not.toContain("ftp:");
    expect(html).not.toContain("ISCRIVITI");
  });

  it("rejects a malformed URL that starts with 'http' but is not parseable", () => {
    // "http://[invalid" starts with "http" — a startsWith() check would pass it.
    // Proper URL parsing must reject it.
    const html = ctaHtml("http://[invalid");
    expect(html).not.toContain("http://[invalid");
    expect(html).not.toContain("ISCRIVITI");
  });

  it("rejects an empty string — omits the event CTA block", () => {
    const html = ctaHtml("");
    expect(html).not.toContain("ISCRIVITI");
  });
});
