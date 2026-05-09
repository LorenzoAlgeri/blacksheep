import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const bodySchema = z.object({
  subscriberId: z.uuid("ID subscriber non valido"),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id: eventId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { subscriberId } = parsed.data;
  const supabase = getSupabase();

  // Check if attendance record exists
  const { data: existing } = await supabase
    .from("event_attendance")
    .select("event_id, subscriber_id, attended_at")
    .eq("event_id", eventId)
    .eq("subscriber_id", subscriberId)
    .maybeSingle();

  if (existing) {
    // Toggle OFF — delete
    const { error } = await supabase
      .from("event_attendance")
      .delete()
      .eq("event_id", eventId)
      .eq("subscriber_id", subscriberId);

    if (error) {
      console.error("[ATTENDANCE] Delete error:", error.message);
      return Response.json({ error: "Errore interno." }, { status: 500 });
    }

    return Response.json({ attended: false });
  }

  // Toggle ON — insert
  const adminEmail = (session as { user?: { email?: string } }).user?.email ?? "unknown";
  const { error } = await supabase.from("event_attendance").insert({
    event_id: eventId,
    subscriber_id: subscriberId,
    marked_by: adminEmail,
  });

  if (error) {
    console.error("[ATTENDANCE] Insert error:", error.message);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  return Response.json({ attended: true, attended_at: new Date().toISOString() });
}
