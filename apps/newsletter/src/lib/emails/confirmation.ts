import { escapeHtml } from "@/lib/html";

interface ConfirmationEmailArgs {
  /** Subscriber name. If empty/omitted, the heading falls back to "SEI DEI NOSTRI!". */
  name?: string;
  /** Full URL of /api/confirm?token=… (not escaped — used in href attribute). */
  confirmUrl: string;
  /** Full URL of /api/unsubscribe?token=… (not escaped). */
  unsubscribeUrl: string;
  /** Dynamic tagline from site_config (raw — escaped internally). */
  tagline: string;
  /** Dynamic venue from site_config (raw — escaped internally). */
  venue: string;
  /** Base site URL (used to build the privacy-policy link). */
  siteUrl: string;
}

/**
 * Render the double-opt-in confirmation email body for newsletter signups.
 *
 * Design contract:
 *  - All user-controlled inputs (name, tagline, venue) are escaped before
 *    interpolation; URL inputs (confirmUrl, unsubscribeUrl, siteUrl) are
 *    expected to be valid URLs and are NOT escaped (HTML attribute usage).
 *  - The function is pure: same args → same string. No I/O.
 *  - Style guide aligned with brand (Arial Black, cream #FFFFF3 over #000000).
 *
 * Reused by /api/events/resend-confirmation in Phase 4 (same HTML payload).
 */
export function renderConfirmationEmail(args: ConfirmationEmailArgs): string {
  const { name, confirmUrl, unsubscribeUrl, tagline, venue, siteUrl } = args;

  const safeTagline = escapeHtml(tagline);
  const safeVenue = escapeHtml(venue);
  const heading =
    name && name.length > 0
      ? `${escapeHtml(name.toUpperCase())}, SEI DEI NOSTRI!`
      : "SEI DEI NOSTRI!";

  return `
<!DOCTYPE html>
<html lang="it" style="background-color:#000000;color-scheme:dark;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>
    :root { color-scheme: dark; }
    body, .body-bg { background-color: #000000 !important; }
    u + .body-bg { background-color: #000000 !important; }
    [data-ogsc] body { background-color: #000000 !important; }
  </style>
</head>
<body class="body-bg" style="margin:0;padding:0;background-color:#000000;color:#FFFFF3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div class="body-bg" style="background-color:#000000;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
    <tr><td align="center" style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#0a0a0a;border:1px solid rgba(255,255,243,0.06);">

        <!-- Spacer top -->
        <tr><td style="height:60px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Spotlight glow -->
        <tr><td style="height:2px;background:radial-gradient(ellipse at center, rgba(255,255,243,0.08) 0%, transparent 70%);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Tagline -->
        <tr><td align="center" style="padding:16px 40px 0;">
          <p style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.45em;color:rgba(255,255,243,0.30);text-align:center;">${safeTagline}</p>
        </td></tr>

        <!-- BLACK SHEEP -->
        <tr><td align="center" style="padding:14px 40px 0;">
          <h1 style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:52px;letter-spacing:0.02em;line-height:0.85;color:#FFFFF3;">BLACK<br>SHEEP</h1>
        </td></tr>

        <!-- Venue -->
        <tr><td align="center" style="padding:20px 40px 0;">
          <p style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:0.15em;color:rgba(255,255,243,0.25);text-transform:uppercase;white-space:nowrap;">${safeVenue}</p>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Cream divider -->
        <tr><td align="center" style="padding:0 80px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="height:1px;background:rgba(255,255,243,0.08);font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Main message -->
        <tr><td align="center" style="padding:0 40px;">
          <p style="margin:0 0 14px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:22px;color:#FFFFF3;letter-spacing:0.04em;">${heading}</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,243,0.50);">Manca solo un click per entrare nella lista.<br>Lineup, date esclusive e backstage pass &mdash; prima di tutti.</p>
        </td></tr>

        <!-- CTA Button -->
        <tr><td align="center" style="padding:40px 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:320px;"><tr>
            <td align="center" style="background-color:#FFFFF3;border-radius:4px;">
              <a href="${confirmUrl}" target="_blank" style="display:block;padding:18px 32px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.15em;color:#0a0a0a;text-decoration:none;font-weight:700;text-align:center;">ENTRA</a>
            </td>
          </tr></table>
        </td></tr>

        <!-- Micro copy -->
        <tr><td align="center" style="padding:16px 40px 0;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,243,0.25);line-height:1.5;">Un click e sei dentro.</p>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:56px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Bottom divider -->
        <tr><td align="center" style="padding:0 80px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="height:1px;background:rgba(255,255,243,0.06);font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:24px 40px;">
          <p style="margin:0 0 8px;font-size:10px;color:rgba(255,255,243,0.15);line-height:1.5;">Se non hai richiesto questa iscrizione, ignora questa email.</p>
          <p style="margin:0;font-size:10px;">
            <a href="${unsubscribeUrl}" style="color:rgba(255,255,243,0.5);text-decoration:underline;">Disiscriviti</a>
            &nbsp;&middot;&nbsp;
            <a href="${siteUrl}/privacy" style="color:rgba(255,255,243,0.5);text-decoration:underline;">Privacy Policy</a>
          </p>
        </td></tr>

        <!-- Instagram -->
        <tr><td align="center" style="padding:0 40px 40px;">
          <a href="https://instagram.com/blacksheep.community_" style="font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.1em;color:rgba(255,255,243,0.20);text-decoration:none;">@BLACKSHEEP.COMMUNITY_</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
  </div>
</body>
</html>
`;
}
