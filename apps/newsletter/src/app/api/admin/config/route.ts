import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { z } from "zod";

const ConfigSchema = z.object({
  tagline: z.string().min(1).max(100).optional(),
  venue: z.string().min(1).max(200).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_config")
    .select("tagline, venue, updated_at")
    .eq("id", "main")
    .single();

  if (error) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json(data);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ConfigSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!parsed.data.tagline && !parsed.data.venue) {
    return Response.json({ error: "Almeno un campo richiesto" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_config")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", "main")
    .select("tagline, venue, updated_at")
    .single();

  if (error) {
    console.error("[CONFIG] Update error:", error.message);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json(data);
}
