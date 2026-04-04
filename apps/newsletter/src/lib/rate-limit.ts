const requests = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 3;

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = requests.get(ip) ?? [];

  // Remove entries outside the window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    return false; // rate limited
  }

  recent.push(now);
  requests.set(ip, recent);

  return true; // allowed
}
