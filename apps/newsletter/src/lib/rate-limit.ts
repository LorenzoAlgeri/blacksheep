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

export { createRateLimiter };
export type { RateLimiterConfig };
