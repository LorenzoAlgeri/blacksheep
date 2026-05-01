import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { adminEventSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/events/[id] — admin detail view of a single event.
 */
export async function GET(_request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = getSupabase();
  const { data, error } = await supabase.from("list_events").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[ADMIN_EVENTS:id] GET error:", error.message, error.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Evento non trovato" }, { status: 404 });
  }
  return Response.json({ event: data });
}

/**
 * PATCH /api/admin/events/[id] — partial update of an event.
 *
 * Body: any subset of adminEventSchema. Slug change OK if not already
 * used (DB UNIQUE 23505 → 409). Status change to 'published' sets
 * published_at=now() if currently NULL.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = adminEventSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dati non validi.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Fetch current state to know if we should set published_at
  const { data: current } = await supabase
    .from("list_events")
    .select("status, published_at")
    .eq("id", id)
    .maybeSingle();

  if (!current) {
    return Response.json({ error: "Evento non trovato" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (
    parsed.data.status === "published" &&
    current.status !== "published" &&
    !current.published_at
  ) {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("list_events")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Slug già usato." }, { status: 409 });
    }
    console.error("[ADMIN_EVENTS:id] PATCH error:", error.message, error.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json({ event: data });
}

/**
 * DELETE /api/admin/events/[id] — soft-archive (default) or hard-delete.
 *
 * Default: UPDATE status='archived'. Hard delete only with ?hard=1 AND
 * count(registrations)=0; otherwise 409 with explanation. RESTRICT FK
 * on list_event_registrations would fail anyway — we surface a friendly
 * 409 instead of letting the DB error bubble up.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const hard = url.searchParams.get("hard") === "1";

  const supabase = getSupabase();

  if (hard) {
    // Check registrations count before deleting
    const { count, error: countError } = await supabase
      .from("list_event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id);

    if (countError) {
      console.error("[ADMIN_EVENTS:id] DELETE count error:", countError.message, countError.code);
      return Response.json({ error: "Errore database" }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return Response.json(
        {
          error: "Impossibile cancellare: ci sono iscrizioni. Archivia l'evento.",
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabase.from("list_events").delete().eq("id", id);

    if (deleteError) {
      console.error("[ADMIN_EVENTS:id] DELETE hard error:", deleteError.message, deleteError.code);
      return Response.json({ error: "Errore database" }, { status: 500 });
    }
    return new Response(null, { status: 204 });
  }

  // Soft archive
  const { data, error: updateError } = await supabase
    .from("list_events")
    .update({ status: "archived" })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[ADMIN_EVENTS:id] DELETE soft error:", updateError.message, updateError.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Evento non trovato" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
