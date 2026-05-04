import { escapeHtml } from "@/lib/html";

/**
 * Builds an event registration deep-link URL for inclusion in email campaigns.
 *
 * Recipients clicking this URL land on the newsletter homepage with the event
 * slug as a query param. The homepage must handle `?event=<slug>&from=email`
 * to scroll to / open the event registration flow.
 *
 * ⚠️  GAP (Phase 8+): The newsletter homepage does not yet handle the
 * `?event=<slug>` query param. Links still land on the correct page and
 * subscribers can register manually. A `scrollToEventByQuery` micro-fix in
 * EventsList / EventsListGate will be needed to make the deep-link fully work.
 */
export function buildEventRegistrationUrl(event: { slug: string }): string {
  const base =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")
      : undefined) ?? "https://www.blacksheep-community.com";
  return `${base}/newsletter?event=${encodeURIComponent(event.slug)}&from=email`;
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
