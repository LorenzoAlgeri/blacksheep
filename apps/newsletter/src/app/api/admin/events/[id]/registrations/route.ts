import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * GET /api/admin/events/[id]/registrations — admin list of registrations
 * for a single event, with subscriber details JOINed in.
 */
export async function GET(request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    Math.max(1, Number(url.searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * pageSize;

  const supabase = getSupabase();
  let query = supabase
    .from("list_event_registrations")
    .select("id, registered_at, source, subscriber:subscribers(id, email, name, status)", {
      count: "exact",
    })
    .eq("event_id", id)
    .order("registered_at", { ascending: false });

  if (q.length > 0) {
    // Filter subscribers by email substring via Supabase relational filter
    query = query.ilike("subscribers.email", `%${q}%`);
  }

  const { data, count, error } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    console.error("[ADMIN_EVENTS_REG] List error:", error.message, error.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json({
    registrations: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}
