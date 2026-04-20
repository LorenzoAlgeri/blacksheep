import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const VALID_STATUSES = new Set(["confirmed", "pending", "blocked"]);
const BASE_SELECT = "id, email, name, status, created_at, subscribed_at, confirmed_at";
const FOLLOW_UP_SELECT = `${BASE_SELECT}, follow_up_count, follow_up_last_sent_at`;

type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string | null;
  subscribed_at: string | null;
  confirmed_at: string | null;
  follow_up_count: number | null;
  follow_up_last_sent_at: string | null;
};

function isMissingFollowUpColumnsError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("follow_up_count") || normalized.includes("follow_up_last_sent_at");
}

function isInvalidStatusValueError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("invalid input value for enum") && normalized.includes("status");
}

function normalizeSubscriberRow(subscriber: Record<string, unknown>): SubscriberRow {
  return {
    id: String(subscriber.id ?? ""),
    email: String(subscriber.email ?? ""),
    name: typeof subscriber.name === "string" ? subscriber.name : null,
    status: typeof subscriber.status === "string" ? subscriber.status : "pending",
    created_at: typeof subscriber.created_at === "string" ? subscriber.created_at : null,
    subscribed_at: typeof subscriber.subscribed_at === "string" ? subscriber.subscribed_at : null,
    confirmed_at: typeof subscriber.confirmed_at === "string" ? subscriber.confirmed_at : null,
    follow_up_count:
      typeof subscriber.follow_up_count === "number" ? subscriber.follow_up_count : null,
    follow_up_last_sent_at:
      typeof subscriber.follow_up_last_sent_at === "string"
        ? subscriber.follow_up_last_sent_at
        : null,
  };
}

export async function GET(request: NextRequest) {
  try {
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
      .select("id", { count: "exact", head: true });

    if (countError) {
      console.error("[SUBSCRIBE] Count error:", countError.message);
      return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
    }

    const statusCounts: Record<string, number> = {
      confirmed: 0,
      pending: 0,
      blocked: 0,
    };

    for (const entryStatus of ["confirmed", "pending", "blocked"]) {
      const { count: entryCount, error: entryError } = await supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("status", entryStatus);

      if (entryError) {
        // Older schemas may not support all status values (e.g. blocked).
        if (isInvalidStatusValueError(entryError.message) && entryStatus === "blocked") {
          statusCounts.blocked = 0;
          continue;
        }

        console.error("[SUBSCRIBE] Status count error:", entryError.message);
        return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
      }

      statusCounts[entryStatus] = entryCount ?? 0;
    }

    let followUpAvailable = true;
    let subscribers: SubscriberRow[] = [];
    let filteredTotal = 0;
    let fetchErrorMessage: string | null = null;

    let subscribersQuery = supabase
      .from("subscribers")
      .select(FOLLOW_UP_SELECT, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      subscribersQuery = subscribersQuery.eq("status", status);
    }

    const primaryResult = await subscribersQuery.range(offset, offset + limit - 1);

    if (!primaryResult.error) {
      subscribers = (primaryResult.data ?? []).map((row) => normalizeSubscriberRow(row));
      filteredTotal = primaryResult.count ?? 0;
    } else {
      fetchErrorMessage = primaryResult.error.message;
      if (isMissingFollowUpColumnsError(primaryResult.error.message)) {
        followUpAvailable = false;
      }

      let fallbackQuery = supabase
        .from("subscribers")
        .select(BASE_SELECT, { count: "exact" })
        .order("created_at", { ascending: false });

      if (status) {
        fallbackQuery = fallbackQuery.eq("status", status);
      }

      const fallbackResult = await fallbackQuery.range(offset, offset + limit - 1);

      if (!fallbackResult.error) {
        subscribers = (fallbackResult.data ?? []).map((row) => normalizeSubscriberRow(row));
        filteredTotal = fallbackResult.count ?? 0;
        fetchErrorMessage = null;
      } else {
        // Last-resort fallback for very old schemas with different columns.
        let wildcardQuery = supabase
          .from("subscribers")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false });

        if (status) {
          wildcardQuery = wildcardQuery.eq("status", status);
        }

        const wildcardResult = await wildcardQuery.range(offset, offset + limit - 1);

        if (!wildcardResult.error) {
          subscribers = (wildcardResult.data ?? []).map((row) => normalizeSubscriberRow(row));
          filteredTotal = wildcardResult.count ?? 0;
          fetchErrorMessage = null;
        } else {
          fetchErrorMessage = wildcardResult.error.message;
        }
      }
    }

    if (fetchErrorMessage && isInvalidStatusValueError(fetchErrorMessage) && status === "blocked") {
      // If blocked is not a valid status in this schema, return an empty blocked page.
      subscribers = [];
      filteredTotal = 0;
      fetchErrorMessage = null;
    }

    if (fetchErrorMessage) {
      console.error("[SUBSCRIBE] Fetch error:", fetchErrorMessage);
      return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
    }

    return Response.json({
      subscribers,
      total: count ?? 0,
      filteredTotal: filteredTotal ?? 0,
      statusCounts,
      followUpAvailable,
      limit,
      offset,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[SUBSCRIBE] Unexpected error:", message);
    return Response.json({ error: "Errore server", code: "SERVER_ERROR" }, { status: 500 });
  }
}
