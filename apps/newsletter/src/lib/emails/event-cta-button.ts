import { escapeHtml } from "@/lib/html";

interface EventCtaButtonArgs {
  /** Base site URL. Trailing slash is normalized away. */
  siteUrl: string;
  /** Event slug (lowercase + dashes, validated by adminEventSchema). */
  slug: string;
  /** Event title (raw — escaped + uppercased internally). */
  title: string;
}

/**
 * Render an HTML anchor styled as the brand "ENTRA" CTA, deep-linking to
 * /api/events/register-from-email with a per-recipient {{TOKEN}} placeholder.
 *
 * The {{TOKEN}} is NOT replaced here: at send time, send-batch.ts substitutes
 * each recipient's subscriber token (same pattern used for {{UNSUB}} —
 * integration in Phase 11). Keeping the placeholder literal makes the
 * template byte-identical for every recipient before substitution.
 *
 * Output is a single <a> snippet; the caller embeds it inside an existing
 * email body (e.g. the admin composer's HTML editor).
 */
export function renderEventCtaButton(args: EventCtaButtonArgs): string {
  const { siteUrl, slug, title } = args;
  const trimmed = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  // Defensive: strip a trailing /newsletter if siteUrl already
  // includes the basePath (e.g. NEXT_PUBLIC_SITE_URL on Vercel set as
  // https://newsletter.blacksheep-community.com/newsletter) — without
  // this we'd produce /newsletter/newsletter/api/... which 404s.
  const baseUrl = trimmed.replace(/\/newsletter\/?$/, "");
  const encodedSlug = encodeURIComponent(slug);
  // {{TOKEN}} placeholder must remain literal; do NOT URL-encode it.
  const href = `${baseUrl}/newsletter/api/events/register-from-email?token={{TOKEN}}&event_slug=${encodedSlug}`;
  const label = `ISCRIVITI ALLA LISTA: ${escapeHtml(title.toUpperCase())}`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:320px;margin:24px auto;"><tr>
  <td align="center" style="background-color:#FFFFF3;border-radius:4px;">
    <a href="${href}" target="_blank" style="display:block;padding:18px 32px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.15em;color:#0a0a0a;text-decoration:none;font-weight:700;text-align:center;">${label}</a>
  </td>
</tr></table>`;
}
