/**
 * Extract a normalized client IP from a request.
 *
 * [SEC-008] Inline `request.headers.get("x-forwarded-for") ?? "unknown"`
 * is fragile: x-forwarded-for can be a comma-separated proxy chain, in
 * which case different chains for the same client produce different keys
 * — which silently bypasses any per-IP rate limiter. We canonicalize:
 *
 *  1. Prefer Vercel's `x-real-ip` (single canonical client IP).
 *  2. Fall back to the FIRST IP in the `x-forwarded-for` chain.
 *  3. Strip the IPv4-mapped IPv6 prefix (`::ffff:1.2.3.4` → `1.2.3.4`).
 *  4. Cap length defensively (a hostile proxy could pad the header to
 *     bloat downstream Map keys / DB rows).
 *  5. Return `"unknown"` when both headers are missing — callers decide
 *     whether to fail open (e.g. /api/health) or fail closed.
 */
export function getClientIp(request: Request): string {
  const real = request.headers.get("x-real-ip");
  if (real && real.trim().length > 0) return normalize(real.trim());

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && first.length > 0) return normalize(first);
  }

  return "unknown";
}

const MAX_IP_LEN = 64; // generous: max IPv6 textual form is 39 chars

function normalize(ip: string): string {
  let out = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (out.length > MAX_IP_LEN) out = out.slice(0, MAX_IP_LEN);
  return out;
}

/**
 * Read and truncate the User-Agent header.
 *
 * [SEC-010] User-Agent strings are attacker-controlled and can be megabytes
 * long. Without a cap, every audit-log INSERT (subscribers, registrations,
 * contact-help, follow-ups) bloats the row and amplifies DoS pressure on the
 * database. 500 bytes covers every real-world UA we've ever seen with margin.
 *
 * Returns "unknown" when the header is missing so callers can use the value
 * directly as a non-empty DB column or log field.
 */
const MAX_USER_AGENT_LEN = 500;

export function getUserAgent(request: Request): string {
  const raw = request.headers.get("user-agent");
  if (!raw) return "unknown";
  const trimmed = raw.length > MAX_USER_AGENT_LEN ? raw.slice(0, MAX_USER_AGENT_LEN) : raw;
  return trimmed;
}
