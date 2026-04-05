import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, rateLimitLogin, createRateLimiter } from "./rate-limit";

describe("rateLimit (subscribe: 3 req/60s)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests under the limit", () => {
    const ip = "allow-test-" + Math.random();
    expect(rateLimit(ip)).toBe(true);
  });

  it("allows up to 3 requests within window", () => {
    const ip = "three-test-" + Math.random();
    expect(rateLimit(ip)).toBe(true);
    expect(rateLimit(ip)).toBe(true);
    expect(rateLimit(ip)).toBe(true);
  });

  it("blocks the 4th request within window", () => {
    const ip = "block-test-" + Math.random();
    rateLimit(ip);
    rateLimit(ip);
    rateLimit(ip);
    expect(rateLimit(ip)).toBe(false);
  });

  it("allows requests again after window expires", () => {
    const ip = "expire-test-" + Math.random();
    const realNow = Date.now;

    let currentTime = 1000000;
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    rateLimit(ip);
    rateLimit(ip);
    rateLimit(ip);
    expect(rateLimit(ip)).toBe(false);

    // Advance time past the 60s window
    currentTime += 61_000;
    expect(rateLimit(ip)).toBe(true);

    Date.now = realNow;
  });
});

describe("rateLimitLogin (5 req/15min)", () => {
  it("allows up to 5 login attempts", () => {
    const ip = "login-test-" + Math.random();
    expect(rateLimitLogin(ip)).toBe(true);
    expect(rateLimitLogin(ip)).toBe(true);
    expect(rateLimitLogin(ip)).toBe(true);
    expect(rateLimitLogin(ip)).toBe(true);
    expect(rateLimitLogin(ip)).toBe(true);
  });

  it("blocks the 6th login attempt", () => {
    const ip = "login-block-" + Math.random();
    for (let i = 0; i < 5; i++) {
      rateLimitLogin(ip);
    }
    expect(rateLimitLogin(ip)).toBe(false);
  });

  it("allows login again after 15-minute window expires", () => {
    const ip = "login-expire-" + Math.random();
    const realNow = Date.now;

    let currentTime = 1000000;
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    for (let i = 0; i < 5; i++) {
      rateLimitLogin(ip);
    }
    expect(rateLimitLogin(ip)).toBe(false);

    // Advance past 15 minutes
    currentTime += 15 * 60_000 + 1000;
    expect(rateLimitLogin(ip)).toBe(true);

    Date.now = realNow;
  });

  it("tracks login attempts per IP independently", () => {
    const ip1 = "login-ip1-" + Math.random();
    const ip2 = "login-ip2-" + Math.random();

    for (let i = 0; i < 5; i++) {
      rateLimitLogin(ip1);
    }
    expect(rateLimitLogin(ip1)).toBe(false);
    // Different IP should still be allowed
    expect(rateLimitLogin(ip2)).toBe(true);
  });
});

describe("createRateLimiter", () => {
  it("creates a rate limiter with custom config", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 2 });
    const ip = "custom-" + Math.random();
    expect(limiter(ip)).toBe(true);
    expect(limiter(ip)).toBe(true);
    expect(limiter(ip)).toBe(false);
  });
});
