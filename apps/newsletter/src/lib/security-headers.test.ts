import { describe, it, expect } from "vitest";

// Pulls the live next.config.ts so the assertions track the source of truth.
// This prevents a regression where a future edit drops a CSP directive without
// noticing the security implication.
import nextConfig from "../../next.config";

async function getRootHeaders(): Promise<Record<string, string>> {
  // next.config exposes async headers(); we only have one rule today.
  const groups = await nextConfig.headers!();
  const root = groups.find((g) => g.source === "/(.*)");
  if (!root) throw new Error("Root header rule missing");
  const out: Record<string, string> = {};
  for (const h of root.headers) out[h.key] = String(h.value);
  return out;
}

describe("security headers — next.config.ts [SEC-005]", () => {
  it("emits the baseline framing / sniff / referrer / HSTS trio", async () => {
    const h = await getRootHeaders();
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(h["Strict-Transport-Security"]).toContain("includeSubDomains");
    expect(h["Strict-Transport-Security"]).toContain("preload");
  });

  it("locks down the CSP surface that an XSS would otherwise pivot into", async () => {
    const h = await getRootHeaders();
    const csp = h["Content-Security-Policy"];

    // Defaults
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self' https://*.supabase.co");

    // The hard locks added by SEC-005
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("emits a Permissions-Policy that denies powerful APIs we don't use", async () => {
    const h = await getRootHeaders();
    const pp = h["Permissions-Policy"];

    for (const directive of [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
    ]) {
      expect(pp).toContain(directive);
    }
  });

  it("emits Cross-Origin-Opener-Policy and disables DNS prefetch", async () => {
    const h = await getRootHeaders();
    expect(h["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(h["X-DNS-Prefetch-Control"]).toBe("off");
  });
});
