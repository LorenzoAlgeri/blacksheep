import { auth } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase";
import { sendNewsletterSchema } from "@/lib/validations";
import { sendBatchEmails } from "@/lib/send-batch";

export async function POST(request: Request) {
  const supabase = getSupabase();
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Richiesta non valida", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }
  const parsed = sendNewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { subject, html, deliveryMode, targetEmail } = parsed.data;

  if (deliveryMode === "single") {
    if (!targetEmail) {
      return Response.json(
        { error: "Email destinatario mancante", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>";
    const replyTo = process.env.REPLY_TO_EMAIL ?? undefined;
    const htmlWithoutUnsubPlaceholder = html.replaceAll("{{UNSUB}}", "");

    const { error: emailError } = await getResend().emails.send({
      from: fromEmail,
      replyTo,
      to: targetEmail,
      subject,
      html: htmlWithoutUnsubPlaceholder,
    });

    if (emailError) {
      console.error("[SEND] Single recipient send error:", emailError);
      return Response.json({ error: "Errore invio email", code: "EMAIL_ERROR" }, { status: 502 });
    }

    return Response.json({ sent: 1, total: 1, target: targetEmail, mode: "single" });
  }

  const { data: subscribers, error: dbError } = await supabase
    .from("subscribers")
    .select("email, token")
    .eq("status", "confirmed");

  if (dbError || !subscribers) {
    console.error("[SEND] Database error fetching subscribers:", dbError?.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json(
      { error: "Nessun iscritto confermato", code: "NO_SUBSCRIBERS" },
      { status: 400 },
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("newsletter_campaigns")
    .insert({
      subject,
      source: "manual",
      recipient_count: subscribers.length,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    console.error("[SEND] Campaign creation error:", campaignError?.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  const recipientsPayload = subscribers.map((subscriber) => ({
    campaign_id: campaign.id,
    subscriber_token: subscriber.token,
  }));

  const { error: recipientsError } = await supabase
    .from("newsletter_campaign_recipients")
    .insert(recipientsPayload);

  if (recipientsError) {
    console.error("[SEND] Campaign recipients insert error:", recipientsError.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  console.log(`[SEND] Sending newsletter "${subject}" to ${subscribers.length} subscribers`);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const result = await sendBatchEmails(subscribers, subject, html, siteUrl, {
    campaignId: campaign.id,
  });

  await supabase
    .from("newsletter_campaigns")
    .update({ sent_count: result.sent, sent_at: new Date().toISOString() })
    .eq("id", campaign.id);

  console.log(`[SEND] Complete: ${result.sent}/${result.total} sent`);

  return Response.json(result);
}
