import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const VALID_STATUSES = new Set(["confirmed", "pending", "blocked"]);

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const session = await auth();
  if (!session) {
    console.warn("[AUTH] Unauthorized access to /api/admin/subscribers");
    return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = request.nextUrl;
  const limit = Math.min(
    Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const statusParam = url.searchParams.get("status");
  const status = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : null;

  const { count, error: countError } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("[SUBSCRIBE] Count error:", countError.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  const statusCountsEntries = await Promise.all(
    ["confirmed", "pending", "blocked"].map(async (entryStatus) => {
      const { count: entryCount, error: entryError } = await supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", entryStatus);

      if (entryError) {
        throw entryError;
      }

      return [entryStatus, entryCount ?? 0] as const;
    }),
  );

  const statusCounts = Object.fromEntries(statusCountsEntries);

  let subscribersQuery = supabase
    .from("subscribers")
    .select(
      "id, email, name, status, created_at, subscribed_at, confirmed_at, follow_up_count, follow_up_last_sent_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (status) {
    subscribersQuery = subscribersQuery.eq("status", status);
  }

  const {
    data: subscribers,
    error,
    count: filteredTotal,
  } = await subscribersQuery.range(offset, offset + limit - 1);

  if (error) {
    console.error("[SUBSCRIBE] Fetch error:", error.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  return Response.json({
    subscribers,
    total: count ?? 0,
    filteredTotal: filteredTotal ?? 0,
    statusCounts,
    limit,
    offset,
    status,
  });
}
