import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { adminEventSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";

const VALID_STATUS = new Set(["all", "draft", "published", "archived"]);
const VALID_SORT = new Set(["event_date_asc", "event_date_desc", "created_at_desc"]);
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/admin/events — admin list of all events with filters.
 *
 * Query params: status (all|draft|published|archived), q (search title/slug),
 * sort (event_date_asc|event_date_desc|created_at_desc), page, pageSize.
 *
 * Returns full row shape (including created_by, published_at, created_at).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") ?? "all";
  const status = VALID_STATUS.has(statusParam) ? statusParam : "all";
  const q = (url.searchParams.get("q") ?? "").trim();
  const sortParam = url.searchParams.get("sort") ?? "event_date_asc";
  const sort = VALID_SORT.has(sortParam) ? sortParam : "event_date_asc";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    Math.max(1, Number(url.searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * pageSize;

  const supabase = getSupabase();
  let query = supabase.from("list_events").select("*", { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (q.length > 0) {
    // Case-insensitive search on title or slug
    query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  if (sort === "event_date_asc") {
    query = query.order("event_date", { ascending: true });
  } else if (sort === "event_date_desc") {
    query = query.order("event_date", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    console.error("[ADMIN_EVENTS] List error:", error.message, error.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json({
    events: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}

/**
 * POST /api/admin/events — create a new event.
 *
 * Body: adminEventSchema. status='published' auto-sets published_at=now().
 * Returns 201 { event } on success.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = adminEventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dati non validi.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  const { description, capacity, ...rest } = parsed.data;
  const insertData = {
    ...rest,
    description: description ?? null,
    capacity: capacity ?? null,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
    created_by: session.user?.email ?? null,
  };

  const { data, error } = await supabase
    .from("list_events")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Slug già usato." }, { status: 409 });
    }
    console.error("[ADMIN_EVENTS] Insert error:", error.message, error.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json({ event: data }, { status: 201 });
}
