import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { sendNewsletterSchema } from "@/lib/validations";
import { sendBatchEmails } from "@/lib/send-batch";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const parsed = sendNewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { subject, html } = parsed.data;

  const { data: subscribers, error: dbError } = await supabase
    .from("subscribers")
    .select("email, token")
    .eq("status", "confirmed");

  if (dbError || !subscribers) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json({ error: "Nessun iscritto confermato" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const result = await sendBatchEmails(subscribers, subject, html, siteUrl);

  return Response.json(result);
}
