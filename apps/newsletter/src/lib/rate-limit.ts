interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  /**
   * Cap on the number of distinct keys tracked at once. When exceeded the
   * least-recently-used key is evicted. Defends against memory bloat from
   * hostile traffic that fans out across many unique IPs (or a misbehaving
   * proxy that produces unique x-forwarded-for chains). [SEC-007]
   */
  maxKeys?: number;
}

interface RateLimiter {
  (key: string): boolean;
  /** Number of distinct keys currently tracked in memory. Test/debug only. */
  trackedKeys(): number;
}

const DEFAULT_MAX_KEYS = 10_000;

function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const windowMs = config.windowMs;
  const maxRequests = config.maxRequests;
  const maxKeys = config.maxKeys ?? DEFAULT_MAX_KEYS;
  const requests = new Map<string, number[]>();

  function check(key: string): boolean {
    const now = Date.now();
    const timestamps = requests.get(key) ?? [];

    // Drop entries outside the window. Always do this — even on the blocked
    // path — so expired timestamps don't pile up.
    const recent = timestamps.filter((t) => now - t < windowMs);
    const blocked = recent.length >= maxRequests;
    if (!blocked) recent.push(now);

    // LRU touch: delete-then-set so the entry moves to the end of the Map's
    // insertion-order iteration. Empty arrays are removed entirely.
    requests.delete(key);
    if (recent.length > 0) requests.set(key, recent);

    // Evict the oldest tracked keys until we're within the cap. On a healthy
    // workload this never fires; under hostile fan-out it bounds memory.
    while (requests.size > maxKeys) {
      const oldest = requests.keys().next().value;
      if (oldest === undefined) break;
      requests.delete(oldest);
    }

    return !blocked;
  }

  (check as RateLimiter).trackedKeys = () => requests.size;
  return check as RateLimiter;
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

// /api/events/register-and-subscribe: 3 requests per minute per IP
export const rateLimitRegisterAndSubscribe = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 3,
});

export { createRateLimiter };
export type { RateLimiterConfig, RateLimiter };
