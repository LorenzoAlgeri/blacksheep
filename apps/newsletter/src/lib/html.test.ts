import { describe, it, expect } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quote", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quote (attribute-safe for email templates)", () => {
    expect(escapeHtml("don't")).toBe("don&#39;t");
  });

  it("escapes ampersand FIRST (no double-encoding)", () => {
    // If '&' weren't escaped first, escaping '<' to '&lt;' would re-trigger
    // the '&' replacement and produce '&amp;lt;' instead of '&lt;'.
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("does not escape characters that are already safe", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("preserves unicode characters (emoji are safe)", () => {
    expect(escapeHtml("Ciao 🐑 BLACK SHEEP")).toBe("Ciao 🐑 BLACK SHEEP");
  });

  it("handles very long strings", () => {
    const long = "<".repeat(1000);
    const result = escapeHtml(long);
    expect(result).toBe("&lt;".repeat(1000));
    expect(result.length).toBe(4000);
  });

  it("escapes multiple special characters in a single call", () => {
    expect(escapeHtml(`<a href="x" title='y'>A & B</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;A &amp; B&lt;/a&gt;",
    );
  });

  it("preserves accented characters (Italian content support)", () => {
    expect(escapeHtml("perché città")).toBe("perché città");
  });
});
