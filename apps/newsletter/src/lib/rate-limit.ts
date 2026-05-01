interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

function createRateLimiter(config: RateLimiterConfig) {
  const requests = new Map<string, number[]>();

  return function check(ip: string): boolean {
    const now = Date.now();
    const timestamps = requests.get(ip) ?? [];

    // Remove entries outside the window
    const recent = timestamps.filter((t) => now - t < config.windowMs);

    if (recent.length >= config.maxRequests) {
      return false; // rate limited
    }

    recent.push(now);
    requests.set(ip, recent);

    return true; // allowed
  };
}

// Subscribe endpoint: 3 requests per minute
export const rateLimit = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 3,
});

// Login endpoint: 5 attempts per 15 minutes
export const rateLimitLogin = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 5,
});

// ============================================================
// BlackSheep List — Phase 4 endpoints
// ============================================================

// /api/events/register: 5 registrations per minute per IP
export const rateLimitEventRegister = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
});

// /api/events/resend-confirmation: 1 resend per minute per email
// (anti-bombing: prevent flooding the same recipient with confirmation emails)
export const rateLimitResendConfirmEmail = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 1,
});

// /api/events/resend-confirmation: 3 resend requests per 15 minutes per IP
// (anti-bot: cap how many distinct emails one IP can probe)
export const rateLimitResendConfirmIp = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 3,
});

// /api/contact-help: 3 submissions per 15 minutes per IP
// (anti-spam: founders inbox protection)
export const rateLimitContactHelp = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 3,
});

export { createRateLimiter };
export type { RateLimiterConfig };
