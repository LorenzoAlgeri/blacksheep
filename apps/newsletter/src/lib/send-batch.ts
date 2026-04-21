import { getResend } from "@/lib/resend";
import { buildListUnsubscribeHeaders } from "@/lib/unsubscribe-headers";

interface Subscriber {
  email: string;
  token: string;
}

interface BatchSendResult {
  sent: number;
  total: number;
}

interface SendBatchOptions {
  campaignId?: string;
}

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

export async function sendBatchEmails(
  subscribers: Subscriber[],
  subject: string,
  html: string,
  siteUrl: string,
  options: SendBatchOptions = {},
): Promise<BatchSendResult> {
  const appBaseUrl = normalizeAppBaseUrl(siteUrl);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>";
  const replyTo = process.env.REPLY_TO_EMAIL ?? undefined;

  let sentCount = 0;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const promises = batch.map((sub) => {
      const unsubscribeUrl = `${appBaseUrl}/api/unsubscribe?token=${sub.token}`;
      const unsubscribeLink = `<br><a href="${appBaseUrl}/api/unsubscribe?token=${sub.token}" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Disiscriviti</a> &middot; <a href="${appBaseUrl}/privacy" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Privacy Policy</a>`;
      const personalizedHtml = html.replaceAll("{{UNSUB}}", unsubscribeLink);
      const trackedHtml = injectOpenTrackingPixel(
        personalizedHtml,
        appBaseUrl,
        sub.token,
        options.campaignId,
      );

      return getResend().emails.send({
        from: fromEmail,
        replyTo,
        to: sub.email,
        subject,
        html: trackedHtml,
        headers: buildListUnsubscribeHeaders({
          unsubscribeUrl,
          mailtoAddress: replyTo ?? "the.blacksheep.night@gmail.com",
          mailtoSubjectToken: sub.token,
        }),
      });
    });

    const results = await Promise.allSettled(promises);
    sentCount += results.filter((r) => r.status === "fulfilled").length;

    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return { sent: sentCount, total: subscribers.length };
}

function injectOpenTrackingPixel(
  html: string,
  siteUrl: string,
  token: string,
  campaignId?: string,
): string {
  if (!campaignId) return html;

  const separator = siteUrl.includes("?") ? "&" : "?";
  const trackingUrl = `${siteUrl}/api/newsletter/open${separator}c=${encodeURIComponent(campaignId)}&t=${encodeURIComponent(token)}`;
  const pixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:block;border:0;outline:none;text-decoration:none;width:1px;height:1px;" />`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }

  return `${html}${pixel}`;
}

function normalizeAppBaseUrl(siteUrl: string): string {
  const trimmedSiteUrl = siteUrl.replace(/\/+$/, "");
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

  if (!basePath) return trimmedSiteUrl;
  if (trimmedSiteUrl.endsWith(basePath)) return trimmedSiteUrl;

  return `${trimmedSiteUrl}${basePath.startsWith("/") ? "" : "/"}${basePath}`;
}
