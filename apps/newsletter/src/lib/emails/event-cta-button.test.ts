import { describe, it, expect } from "vitest";
import { renderEventCtaButton } from "./event-cta-button";

const baseArgs = {
  siteUrl: "https://blacksheep.community",
  slug: "monday-club-night-may",
  title: "BLACK SHEEP — Monday Club Night",
};

describe("renderEventCtaButton", () => {
  it("returns a non-empty HTML snippet containing an anchor tag", () => {
    const html = renderEventCtaButton(baseArgs);
    expect(html).toBeTruthy();
    expect(html).toContain("<a ");
    expect(html).toContain("</a>");
  });

  it("preserves the {{TOKEN}} placeholder literally (NOT escaped)", () => {
    const html = renderEventCtaButton(baseArgs);
    expect(html).toContain("{{TOKEN}}");
    // Make sure the placeholder didn't get encoded into &#123; etc.
    expect(html).not.toContain("&#123;");
    expect(html).not.toContain("%7B");
  });

  it("includes the event_slug query param", () => {
    const html = renderEventCtaButton(baseArgs);
    expect(html).toContain("event_slug=monday-club-night-may");
  });

  it("URL-encodes a slug to defend against malformed input", () => {
    // Slug regex enforces lowercase+dash, but we still encodeURIComponent
    // as defense in depth. Sanity check: encoded output for an alphanumeric
    // slug is unchanged.
    const html = renderEventCtaButton({ ...baseArgs, slug: "abc-def-123" });
    expect(html).toContain("event_slug=abc-def-123");
  });

  it("includes the title in uppercase as the button label", () => {
    const html = renderEventCtaButton(baseArgs);
    expect(html).toContain("ISCRIVITI ALLA LISTA: BLACK SHEEP");
  });

  it("escapes the title to prevent XSS", () => {
    const html = renderEventCtaButton({
      ...baseArgs,
      title: `<script>alert('x')</script>`,
    });
    expect(html).not.toContain("<script>alert('x')</script>");
    expect(html).toContain("&lt;SCRIPT&gt;");
  });

  it("builds the href correctly with siteUrl + path + query", () => {
    const html = renderEventCtaButton(baseArgs);
    expect(html).toContain(
      `https://blacksheep.community/newsletter/api/events/register-from-email?token={{TOKEN}}&event_slug=monday-club-night-may`,
    );
  });

  it("does NOT produce a double slash when siteUrl already ends in /", () => {
    const html = renderEventCtaButton({ ...baseArgs, siteUrl: "https://blacksheep.community/" });
    expect(html).not.toContain("//newsletter/api");
    expect(html).toContain(
      "https://blacksheep.community/newsletter/api/events/register-from-email",
    );
  });

  it("does NOT produce missing slash when siteUrl has no trailing /", () => {
    const html = renderEventCtaButton({ ...baseArgs, siteUrl: "https://blacksheep.community" });
    expect(html).toContain(
      "https://blacksheep.community/newsletter/api/events/register-from-email",
    );
  });
});
