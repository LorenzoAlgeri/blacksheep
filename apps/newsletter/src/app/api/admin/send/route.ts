import { auth } from "@/lib/auth";
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

  const { subject, html } = parsed.data;

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

  console.log(`[SEND] Sending newsletter "${subject}" to ${subscribers.length} subscribers`);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const result = await sendBatchEmails(subscribers, subject, html, siteUrl);
  console.log(`[SEND] Complete: ${result.sent}/${result.total} sent`);

  return Response.json(result);
}
