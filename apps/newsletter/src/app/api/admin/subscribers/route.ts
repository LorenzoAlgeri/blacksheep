import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

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

  const { count, error: countError } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("[SUBSCRIBE] Count error:", countError.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select(
      "id, email, name, status, created_at, subscribed_at, confirmed_at, follow_up_count, follow_up_last_sent_at",
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[SUBSCRIBE] Fetch error:", error.message);
    return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
  }

  return Response.json({
    subscribers,
    total: count ?? 0,
    limit,
    offset,
  });
}
