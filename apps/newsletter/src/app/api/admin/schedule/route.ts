import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { scheduleNewsletterSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = scheduleNewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { subject, html, scheduledAt } = parsed.data;

  const { error } = await supabase.from("scheduled_newsletters").insert({
    subject,
    html,
    scheduled_at: scheduledAt,
  });

  if (error) {
    console.error("Schedule error:", error);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json({ success: true });
}
