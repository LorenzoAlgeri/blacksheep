interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

function createRateLimiter(config: RateLimiterConfig) {
  const requests = new Map<string, number[]>();

  return function check(ip: string): boolean {
    const now = Date.now();
    const timestamps = requests.get(ip) ?? [];
    const recent = timestamps.filter((t) => now - t < config.windowMs);

    if (recent.length >= config.maxRequests) {
      return false;
    }

    recent.push(now);
    requests.set(ip, recent);
    return true;
  };
}

// Contact form: 5 requests per minute
export const contactRateLimit = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
});
