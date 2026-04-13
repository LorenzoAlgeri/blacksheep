import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { subscriberActionSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = subscriberActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Azione non valida." }, { status: 400 });
  }

  const supabase = getSupabase();
  const newStatus = parsed.data.action === "block" ? "blocked" : "unsubscribed";

  const { error } = await supabase.from("subscribers").update({ status: newStatus }).eq("id", id);

  if (error) {
    console.error("[ADMIN] Subscriber update error:", error.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  return Response.json({ success: true, status: newStatus });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { error } = await supabase.from("subscribers").delete().eq("id", id);

  if (error) {
    console.error("[ADMIN] Subscriber delete error:", error.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  return Response.json({ success: true, deleted: true });
}
