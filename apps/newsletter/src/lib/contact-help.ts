import { escapeHtml } from "@/lib/html";

/**
 * Founders' addresses that receive every contact-help submission.
 *
 * Hardcoded as code constants (NOT env vars) so the recipient list is
 * code-reviewable and survives infrastructure mistakes (env scrubs,
 * staging copies, etc.). Update via PR.
 */
export const CONTACT_HELP_RECIPIENTS = [
  "info@lorenzoalgeri.it",
  "the.blacksheep.night@gmail.com",
] as const;

interface ContactHelpEmailArgs {
  email: string;
  phone: string;
  name: string;
  message?: string;
  ip: string;
  userAgent: string;
}

/**
 * Render the founder-facing email body for /api/contact-help submissions.
 *
 * Brand-light because the audience is internal (founders); compact list
 * of fields, escaped for XSS safety, with a tail line of audit metadata
 * (IP + UA) for triage.
 */
export function renderContactHelpEmail(args: ContactHelpEmailArgs): string {
  const { email, phone, name, message, ip, userAgent } = args;

  const messageBlock =
    message && message.length > 0
      ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#0a0a0a;"><strong>Messaggio:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f0;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFF3;border:1px solid rgba(0,0,0,0.08);padding:32px;">
    <h1 style="margin:0 0 24px;font-family:'Arial Black',Arial,sans-serif;font-size:18px;color:#0a0a0a;letter-spacing:0.05em;">RICHIESTA SUPPORTO BLACKSHEEP</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#0a0a0a;"><strong>Nome:</strong> ${escapeHtml(name)}</p>
    <p style="margin:0 0 8px;font-size:14px;color:#0a0a0a;"><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p style="margin:0 0 8px;font-size:14px;color:#0a0a0a;"><strong>Telefono:</strong> ${escapeHtml(phone)}</p>
    ${messageBlock}
    <hr style="border:0;border-top:1px solid rgba(0,0,0,0.1);margin:24px 0;">
    <p style="margin:0;font-size:11px;color:#666;line-height:1.5;">
      <strong>Audit:</strong><br>
      IP: ${escapeHtml(ip)}<br>
      User-Agent: ${escapeHtml(userAgent)}
    </p>
  </div>
</body>
</html>`;
}
