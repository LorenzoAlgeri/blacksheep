import { resend } from "@/lib/resend";

interface Subscriber {
  email: string;
  token: string;
}

interface BatchSendResult {
  sent: number;
  total: number;
}

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

export async function sendBatchEmails(
  subscribers: Subscriber[],
  subject: string,
  html: string,
  siteUrl: string,
): Promise<BatchSendResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>";

  let sentCount = 0;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const promises = batch.map((sub) => {
      const unsubscribeLink = `<br><a href="${siteUrl}/api/unsubscribe?token=${sub.token}" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Disiscriviti</a> &middot; <a href="${siteUrl}/privacy" style="color:rgba(255,255,243,0.25);text-decoration:underline;">Privacy Policy</a>`;
      const personalizedHtml = html.replaceAll("{{UNSUB}}", unsubscribeLink);

      return resend.emails.send({
        from: fromEmail,
        to: sub.email,
        subject,
        html: personalizedHtml,
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
