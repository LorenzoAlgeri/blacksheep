import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { scheduleNewsletterSchema } from "@/lib/validations";

export async function POST(request: Request) {
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
  const parsed = scheduleNewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { subject, html, scheduledAt } = parsed.data;

  const { error } = await supabase.from("scheduled_newsletters").insert({
    subject,
    html,
    scheduled_at: scheduledAt,
  });

  if (error) {
    console.error("[SEND] Schedule error:", error.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  return Response.json({ success: true });
}
