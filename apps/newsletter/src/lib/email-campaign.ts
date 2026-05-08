import { escapeHtml } from "@/lib/html";

/**
 * Builds an event registration deep-link URL for inclusion in email campaigns.
 *
 * The URL targets the GET /api/events/register-from-email endpoint, which
 * looks up the subscriber by `token`, registers them to the event identified
 * by `event_slug`, and 303-redirects to /events/<slug>/registered with a
 * status query string. This produces a true single-click registration flow.
 *
 * The literal `{{TOKEN}}` placeholder is preserved here on purpose: it is
 * substituted per-recipient at send time by send-batch.ts (same pattern as
 * `{{UNSUB}}`). Keeping the placeholder literal makes the campaign HTML
 * byte-identical for every recipient before substitution, which is
 * important for Resend idempotency keys and template caching.
 */
export function buildEventRegistrationUrl(event: { slug: string }): string {
  const raw =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")
      : undefined) ?? "https://www.blacksheep-community.com";
  // Defensive: if NEXT_PUBLIC_SITE_URL already ends with /newsletter
  // (e.g. on Vercel set as https://newsletter.blacksheep-community.com/newsletter),
  // strip it before re-appending — otherwise we'd build a double
  // /newsletter/newsletter path which 404s on the prod app.
  const base = raw.replace(/\/newsletter\/?$/, "");
  // {{TOKEN}} must remain literal — do NOT URL-encode it.
  return `${base}/newsletter/api/events/register-from-email?token={{TOKEN}}&event_slug=${encodeURIComponent(event.slug)}`;
}

/**
 * Inserts `insert` at `position` in `text`.
 * Position is clamped to [0, text.length].
 */
export function insertAtCursor(text: string, insert: string, position: number): string {
  const pos = Math.max(0, Math.min(position, text.length));
  return text.slice(0, pos) + insert + text.slice(pos);
}

const URL_REGEX = /https?:\/\/[^\s<>[\]()'"]+/g;

/**
 * Converts plain text to HTML for the email body preview panel:
 * - Escapes HTML-significant characters
 * - Auto-links http/https URLs
 * - Converts newlines to <br>
 *
 * Used for display only — the actual email still uses buildEmailHtml.
 */
export function renderEmailPreview(plainText: string): string {
  let result = "";
  let lastIndex = 0;

  for (const match of plainText.matchAll(URL_REGEX)) {
    const before = plainText.slice(lastIndex, match.index);
    result += escapeHtml(before);

    const url = match[0];
    const safeUrl = escapeHtml(url);
    result += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">${safeUrl}</a>`;
    lastIndex = (match.index ?? 0) + url.length;
  }

  result += escapeHtml(plainText.slice(lastIndex));
  return result.replace(/\n/g, "<br>");
}
