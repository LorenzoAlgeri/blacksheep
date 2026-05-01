import { describe, it, expect } from "vitest";
import { CONTACT_HELP_RECIPIENTS, renderContactHelpEmail } from "./contact-help";

describe("CONTACT_HELP_RECIPIENTS", () => {
  it("contains exactly the 2 founder addresses", () => {
    expect(CONTACT_HELP_RECIPIENTS).toEqual([
      "info@lorenzoalgeri.it",
      "the.blacksheep.night@gmail.com",
    ]);
  });
});

describe("renderContactHelpEmail", () => {
  const baseArgs = {
    email: "user@example.com",
    phone: "+39 333 1234567",
    name: "Mario Rossi",
    ip: "1.2.3.4",
    userAgent: "Mozilla/5.0 ...",
  };

  it("includes all required fields (escaped)", () => {
    const html = renderContactHelpEmail(baseArgs);
    expect(html).toContain("user@example.com");
    expect(html).toContain("+39 333 1234567");
    expect(html).toContain("Mario Rossi");
    expect(html).toContain("1.2.3.4");
    expect(html).toContain("Mozilla/5.0");
  });

  it("includes the optional message when provided", () => {
    const html = renderContactHelpEmail({ ...baseArgs, message: "Aiuto, non trovo email" });
    expect(html).toContain("Aiuto, non trovo email");
  });

  it("omits the message block when message is omitted", () => {
    const html = renderContactHelpEmail(baseArgs);
    expect(html).not.toContain("Messaggio:");
  });

  it("omits the message block when message is empty string", () => {
    const html = renderContactHelpEmail({ ...baseArgs, message: "" });
    expect(html).not.toContain("Messaggio:");
  });

  it("escapes name to prevent XSS", () => {
    const html = renderContactHelpEmail({
      ...baseArgs,
      name: `<script>alert('x')</script>`,
    });
    expect(html).not.toContain("<script>alert('x')</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes message to prevent XSS", () => {
    const html = renderContactHelpEmail({
      ...baseArgs,
      message: `<img onerror="alert(1)">`,
    });
    expect(html).not.toContain(`<img onerror=`);
    expect(html).toContain("&lt;img");
  });

  it("escapes user agent to prevent XSS", () => {
    const html = renderContactHelpEmail({
      ...baseArgs,
      userAgent: `</td><script>foo</script>`,
    });
    expect(html).not.toContain("</td><script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes email to prevent attribute injection", () => {
    const html = renderContactHelpEmail({
      ...baseArgs,
      email: `evil"<script>x</script>`,
    });
    expect(html).not.toContain(`<script>x</script>`);
  });
});
