import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isAllowedOrigin } from "./origin-check";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/some-endpoint", {
    headers: new Headers(headers),
    method: "POST",
  });
}

describe("isAllowedOrigin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SITE_URL = "https://blacksheep.community";
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true when Origin header matches NEXT_PUBLIC_SITE_URL", () => {
    const req = makeRequest({ origin: "https://blacksheep.community" });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("returns true when Origin missing but Referer matches site URL", () => {
    const req = makeRequest({
      referer: "https://blacksheep.community/newsletter/events",
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("returns false when Origin differs from allowed list", () => {
    const req = makeRequest({ origin: "https://attacker.example" });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("returns false when both Origin and Referer are missing", () => {
    const req = makeRequest({});
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("returns true when Origin is localhost in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = makeRequest({ origin: "http://localhost:3000" });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("returns false when Origin is localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = makeRequest({ origin: "http://localhost:3000" });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("ignores Referer when Origin is present (Origin wins)", () => {
    const req = makeRequest({
      origin: "https://attacker.example",
      referer: "https://blacksheep.community/page",
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("treats Referer with trailing path as allowed if origin part matches", () => {
    const req = makeRequest({
      referer: "https://blacksheep.community/newsletter?foo=bar",
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });
});
