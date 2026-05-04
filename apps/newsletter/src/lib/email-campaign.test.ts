import { describe, it, expect } from "vitest";
import { buildEventRegistrationUrl, insertAtCursor, renderEmailPreview } from "./email-campaign";

// ---------------------------------------------------------------------------
// buildEventRegistrationUrl
// ---------------------------------------------------------------------------

describe("buildEventRegistrationUrl", () => {
  it("builds URL with default base when NEXT_PUBLIC_SITE_URL is not set", () => {
    const url = buildEventRegistrationUrl({ slug: "blacknight-may" });
    expect(url).toBe(
      "https://www.blacksheep-community.com/newsletter?event=blacknight-may&from=email",
    );
  });

  it("encodes special characters in the slug", () => {
    const url = buildEventRegistrationUrl({ slug: "event with spaces" });
    expect(url).toContain("event%20with%20spaces");
    expect(url).toContain("&from=email");
  });

  it("strips trailing slash from base URL", () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    const url = buildEventRegistrationUrl({ slug: "test-slug" });
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
    expect(url).toBe("https://example.com/newsletter?event=test-slug&from=email");
  });
});

// ---------------------------------------------------------------------------
// insertAtCursor
// ---------------------------------------------------------------------------

describe("insertAtCursor", () => {
  it("inserts at the beginning (position 0)", () => {
    expect(insertAtCursor("world", "hello ", 0)).toBe("hello world");
  });

  it("inserts in the middle", () => {
    expect(insertAtCursor("hello world", "-beautiful-", 5)).toBe("hello-beautiful- world");
  });

  it("inserts at the end", () => {
    expect(insertAtCursor("hello", " world", 5)).toBe("hello world");
  });

  it("handles empty text", () => {
    expect(insertAtCursor("", "something", 0)).toBe("something");
  });

  it("clamps position below 0 to 0", () => {
    expect(insertAtCursor("hello", "X", -10)).toBe("Xhello");
  });

  it("clamps position beyond length to end", () => {
    expect(insertAtCursor("hello", "X", 999)).toBe("helloX");
  });
});

// ---------------------------------------------------------------------------
// renderEmailPreview
// ---------------------------------------------------------------------------

describe("renderEmailPreview", () => {
  it("converts newlines to <br>", () => {
    expect(renderEmailPreview("line one\nline two")).toBe("line one<br>line two");
  });

  it("auto-links http URLs", () => {
    const result = renderEmailPreview("Visit https://example.com today");
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it("auto-links URLs with query params", () => {
    const result = renderEmailPreview(
      "Register: https://www.blacksheep-community.com/newsletter?event=slug&from=email",
    );
    expect(result).toContain(
      'href="https://www.blacksheep-community.com/newsletter?event=slug&amp;from=email"',
    );
  });

  it("escapes HTML special characters outside URLs", () => {
    const result = renderEmailPreview("Hello <world> & 'you'");
    expect(result).toContain("&lt;world&gt;");
    expect(result).toContain("&amp;");
    expect(result).not.toContain("<world>");
  });

  it("handles text with no URLs or newlines unchanged except escaping", () => {
    expect(renderEmailPreview("plain text")).toBe("plain text");
  });

  it("handles empty string", () => {
    expect(renderEmailPreview("")).toBe("");
  });
});
