import { escapeHtml } from "@/lib/html";

interface EventRegistrationEmailArgs {
  /** Subscriber name. If empty/omitted, heading falls back to "SEI IN LISTA". */
  name?: string;
  /** Event title (raw — escaped internally). */
  eventTitle: string;
  /** Event date as ISO string or Date object. Formatted in it-IT locale. */
  eventDate: string | Date;
  /** Event venue (raw — escaped internally). */
  eventVenue: string;
  /** Optional event description (raw — escaped internally; block omitted if absent). */
  eventDescription?: string | null;
  /** Full URL of /api/unsubscribe?token=… (not escaped — used in href). */
  unsubscribeUrl: string;
  /** Base site URL (used for privacy link). */
  siteUrl: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

function formatEventDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return DATE_FORMAT.format(date);
}

/**
 * Render the post-registration confirmation email for BlackSheep List events.
 *
 * Sent after /api/events/register inserts a row into list_event_registrations
 * (Phase 4). Reuses the same brand style guide as renderConfirmationEmail.
 *
 * Design contract:
 *  - name, eventTitle, eventVenue, eventDescription: escaped internally.
 *  - unsubscribeUrl, siteUrl: NOT escaped (URL attributes).
 *  - eventDate: formatted via Intl.DateTimeFormat 'it-IT' (Europe/Rome TZ).
 *  - Description block is omitted entirely if the field is undefined or null.
 */
export function renderEventRegistrationEmail(args: EventRegistrationEmailArgs): string {
  const { name, eventTitle, eventDate, eventVenue, eventDescription, unsubscribeUrl, siteUrl } =
    args;

  const heading =
    name && name.length > 0 ? `${escapeHtml(name.toUpperCase())}, SEI IN LISTA` : "SEI IN LISTA";

  const safeTitle = escapeHtml(eventTitle);
  const safeVenue = escapeHtml(eventVenue);
  const formattedDate = escapeHtml(formatEventDate(eventDate));

  const descriptionBlock =
    eventDescription && eventDescription.length > 0
      ? `
        <!-- Description -->
        <tr><td align="center" style="padding:12px 40px 0;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,243,0.50);">${escapeHtml(eventDescription)}</p>
        </td></tr>`
      : "";

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

        <!-- BLACK SHEEP logo -->
        <tr><td align="center" style="padding:30px 40px 0;">
          <h1 style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:42px;letter-spacing:0.02em;line-height:0.85;color:#FFFFF3;">BLACK<br>SHEEP</h1>
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

        <!-- Heading -->
        <tr><td align="center" style="padding:0 40px;">
          <p style="margin:0 0 14px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:22px;color:#FFFFF3;letter-spacing:0.04em;">${heading}</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,243,0.50);">Ti aspettiamo all'evento. Ecco i dettagli:</p>
        </td></tr>

        <!-- Spacer -->
        <tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Event title -->
        <tr><td align="center" style="padding:0 40px;">
          <p style="margin:0 0 8px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:18px;color:#FFFFF3;letter-spacing:0.04em;text-transform:uppercase;">${safeTitle}</p>
        </td></tr>

        <!-- Event date -->
        <tr><td align="center" style="padding:8px 40px 0;">
          <p style="margin:0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.15em;color:rgba(255,255,243,0.65);text-transform:uppercase;">${formattedDate}</p>
        </td></tr>

        <!-- Event venue -->
        <tr><td align="center" style="padding:8px 40px 0;">
          <p style="margin:0;font-size:12px;letter-spacing:0.05em;color:rgba(255,255,243,0.45);">${safeVenue}</p>
        </td></tr>${descriptionBlock}

        <!-- Spacer -->
        <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Reminder copy -->
        <tr><td align="center" style="padding:0 40px;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,243,0.30);line-height:1.5;">Riceverai un promemoria il giorno dell'evento.</p>
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
