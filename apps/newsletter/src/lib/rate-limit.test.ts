import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  rateLimit,
  rateLimitLogin,
  createRateLimiter,
  rateLimitEventRegister,
  rateLimitResendConfirmIp,
  rateLimitResendConfirmEmail,
  rateLimitContactHelp,
} from "./rate-limit";

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

  it("treats different keys independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
    const k1 = "indep-1-" + Math.random();
    const k2 = "indep-2-" + Math.random();
    expect(limiter(k1)).toBe(true);
    expect(limiter(k1)).toBe(false); // k1 exhausted
    expect(limiter(k2)).toBe(true); // k2 still has quota
  });

  it("resets after window expires", () => {
    const realNow = Date.now;
    let currentTime = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 1 });
    const k = "reset-" + Math.random();
    expect(limiter(k)).toBe(true);
    expect(limiter(k)).toBe(false);

    currentTime += 11_000;
    expect(limiter(k)).toBe(true);

    Date.now = realNow;
  });
});

// ============================================================
// BlackSheep List — Phase 4 endpoints rate limiters
// ============================================================

describe("rateLimitEventRegister (5 req/60s/IP)", () => {
  it("allows up to 5 registrations per IP within window", () => {
    const ip = "event-allow-" + Math.random();
    for (let i = 0; i < 5; i++) {
      expect(rateLimitEventRegister(ip)).toBe(true);
    }
  });

  it("blocks the 6th registration from same IP", () => {
    const ip = "event-block-" + Math.random();
    for (let i = 0; i < 5; i++) {
      rateLimitEventRegister(ip);
    }
    expect(rateLimitEventRegister(ip)).toBe(false);
  });

  it("tracks IPs independently", () => {
    const ip1 = "event-ip1-" + Math.random();
    const ip2 = "event-ip2-" + Math.random();
    for (let i = 0; i < 5; i++) {
      rateLimitEventRegister(ip1);
    }
    expect(rateLimitEventRegister(ip1)).toBe(false);
    expect(rateLimitEventRegister(ip2)).toBe(true);
  });
});

describe("rateLimitResendConfirmEmail (1 req/60s/email)", () => {
  it("allows the first resend for an email", () => {
    const email = "user-" + Math.random() + "@test";
    expect(rateLimitResendConfirmEmail(email)).toBe(true);
  });

  it("blocks the 2nd resend for the same email within window", () => {
    const email = "user-" + Math.random() + "@test";
    rateLimitResendConfirmEmail(email);
    expect(rateLimitResendConfirmEmail(email)).toBe(false);
  });

  it("allows resend for a different email", () => {
    const email1 = "u1-" + Math.random() + "@test";
    const email2 = "u2-" + Math.random() + "@test";
    rateLimitResendConfirmEmail(email1);
    expect(rateLimitResendConfirmEmail(email1)).toBe(false);
    expect(rateLimitResendConfirmEmail(email2)).toBe(true);
  });

  it("allows resend again after 60s window expires", () => {
    const realNow = Date.now;
    let currentTime = 2_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    const email = "expire-" + Math.random() + "@test";
    rateLimitResendConfirmEmail(email);
    expect(rateLimitResendConfirmEmail(email)).toBe(false);

    currentTime += 61_000;
    expect(rateLimitResendConfirmEmail(email)).toBe(true);

    Date.now = realNow;
  });
});

describe("rateLimitResendConfirmIp (3 req/15min/IP)", () => {
  it("allows up to 3 resend requests per IP", () => {
    const ip = "resend-ip-" + Math.random();
    for (let i = 0; i < 3; i++) {
      expect(rateLimitResendConfirmIp(ip)).toBe(true);
    }
  });

  it("blocks the 4th resend request from same IP", () => {
    const ip = "resend-ip-block-" + Math.random();
    for (let i = 0; i < 3; i++) {
      rateLimitResendConfirmIp(ip);
    }
    expect(rateLimitResendConfirmIp(ip)).toBe(false);
  });

  it("allows resend after 15-minute window expires", () => {
    const realNow = Date.now;
    let currentTime = 3_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    const ip = "resend-expire-" + Math.random();
    for (let i = 0; i < 3; i++) {
      rateLimitResendConfirmIp(ip);
    }
    expect(rateLimitResendConfirmIp(ip)).toBe(false);

    currentTime += 15 * 60_000 + 1000;
    expect(rateLimitResendConfirmIp(ip)).toBe(true);

    Date.now = realNow;
  });
});

describe("rateLimitContactHelp (3 req/15min/IP)", () => {
  it("allows up to 3 contact-help submissions per IP", () => {
    const ip = "contact-allow-" + Math.random();
    for (let i = 0; i < 3; i++) {
      expect(rateLimitContactHelp(ip)).toBe(true);
    }
  });

  it("blocks the 4th submission from same IP", () => {
    const ip = "contact-block-" + Math.random();
    for (let i = 0; i < 3; i++) {
      rateLimitContactHelp(ip);
    }
    expect(rateLimitContactHelp(ip)).toBe(false);
  });
});
