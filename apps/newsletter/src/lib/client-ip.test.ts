import { describe, it, expect } from "vitest";
import { getClientIp } from "./client-ip";

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/", { headers });
}

describe("getClientIp [SEC-008]", () => {
  it("prefers x-real-ip when present", () => {
    expect(getClientIp(req({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "1.2.3.4",
    );
  });

  it("falls back to first IP of x-forwarded-for chain", () => {
    expect(getClientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" }))).toBe("1.2.3.4");
  });

  it("trims whitespace around the chosen IP", () => {
    expect(getClientIp(req({ "x-forwarded-for": "   1.2.3.4   ,5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("returns 'unknown' when both headers are missing", () => {
    expect(getClientIp(req())).toBe("unknown");
  });

  it("returns 'unknown' when headers are empty", () => {
    expect(getClientIp(req({ "x-real-ip": "", "x-forwarded-for": "" }))).toBe("unknown");
  });

  it("strips ::ffff: prefix from IPv4-mapped IPv6", () => {
    expect(getClientIp(req({ "x-real-ip": "::ffff:1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("caps absurdly long header values to prevent Map-key / DB bloat", () => {
    const huge = "1.".repeat(200);
    const result = getClientIp(req({ "x-real-ip": huge }));
    expect(result.length).toBeLessThanOrEqual(64);
  });

  // Regression test for the bug this helper exists to fix:
  // two requests from the same client behind different proxy chains
  // must hash to the same rate-limit bucket.
  it("normalizes the same client across different proxy chains [SEC-008]", () => {
    const a = getClientIp(req({ "x-forwarded-for": "1.2.3.4" }));
    const b = getClientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }));
    const c = getClientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 172.16.0.1" }));
    expect(a).toBe("1.2.3.4");
    expect(b).toBe("1.2.3.4");
    expect(c).toBe("1.2.3.4");
  });
});
