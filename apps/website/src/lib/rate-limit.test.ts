import { describe, it, expect, vi } from "vitest";
import { contactRateLimit } from "./rate-limit";

// We can't easily reset the module-level Map, so we test the exported
// createRateLimiter indirectly. Since contactRateLimit is a singleton,
// we use unique IPs per test to avoid cross-test pollution.

describe("contactRateLimit", () => {
  it("should allow first 5 requests from same IP", () => {
    const ip = "test-allow-" + Math.random();
    for (let i = 0; i < 5; i++) {
      expect(contactRateLimit(ip)).toBe(true);
    }
  });

  it("should block 6th request from same IP", () => {
    const ip = "test-block-" + Math.random();
    for (let i = 0; i < 5; i++) {
      contactRateLimit(ip);
    }
    expect(contactRateLimit(ip)).toBe(false);
  });

  it("should allow requests from different IPs independently", () => {
    const ip1 = "test-ip1-" + Math.random();
    const ip2 = "test-ip2-" + Math.random();

    for (let i = 0; i < 5; i++) {
      contactRateLimit(ip1);
    }

    // ip1 is blocked
    expect(contactRateLimit(ip1)).toBe(false);
    // ip2 is fresh
    expect(contactRateLimit(ip2)).toBe(true);
  });

  it("should allow requests after window expires", () => {
    vi.useFakeTimers();
    const ip = "test-expire-" + Math.random();

    for (let i = 0; i < 5; i++) {
      contactRateLimit(ip);
    }
    expect(contactRateLimit(ip)).toBe(false);

    // Advance past the 60s window
    vi.advanceTimersByTime(61_000);

    expect(contactRateLimit(ip)).toBe(true);
    vi.useRealTimers();
  });
});
