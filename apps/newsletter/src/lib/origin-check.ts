/**
 * CSRF defense via Origin / Referer allowlist.
 *
 * Public POST endpoints reject cross-origin requests by checking that the
 * request comes from the configured site URL (or from localhost during
 * local development). The check uses Origin first; if missing, falls back
 * to Referer (browsers always send at least one of these for cross-origin
 * fetches).
 *
 * NOT a substitute for proper auth on admin endpoints — this is the
 * baseline defense for ANONYMOUS public POST endpoints (subscribe,
 * events/register, contact-help, etc).
 */

const LOCALHOST_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function siteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    return new URL(url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function refererOrigin(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(request: Request): boolean {
  const allowed = new Set<string>([siteOrigin()]);

  if (process.env.NODE_ENV === "development") {
    LOCALHOST_ORIGINS.forEach((o) => allowed.add(o));
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return allowed.has(origin);
  }

  const referer = request.headers.get("referer");
  const refOrigin = refererOrigin(referer);
  if (refOrigin) {
    return allowed.has(refOrigin);
  }

  // No Origin and no Referer: cannot prove the source. Reject.
  return false;
}
