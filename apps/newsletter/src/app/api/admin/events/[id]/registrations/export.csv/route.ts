import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RegistrationRow {
  registered_at: string | null;
  source: string | null;
  subscriber: {
    email?: string | null;
    name?: string | null;
    status?: string | null;
    gender?: string | null;
  } | null;
}

/**
 * Escape a single CSV field per RFC 4180:
 *  - quote if contains comma, quote, CR, or LF
 *  - double up internal quotes
 */
function csvField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/admin/events/[id]/registrations/export.csv — full CSV export.
 *
 * No pagination: streams the entire registration set for the event.
 * Headers: email, name, status, registered_at, source.
 */
export async function GET(_request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const supabase = getSupabase();

  // Fetch event slug for filename
  const { data: event } = await supabase
    .from("list_events")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    return Response.json({ error: "Evento non trovato" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("list_event_registrations")
    .select("registered_at, source, subscriber:subscribers(email, name, status, gender)")
    .eq("event_id", id)
    .order("registered_at", { ascending: false });

  if (error) {
    console.error("[ADMIN_EVENTS_REG] Export error:", error.message, error.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as RegistrationRow[];
  const header = "email,name,status,gender,registered_at,source";
  const body = rows
    .map((r) => {
      const sub = r.subscriber ?? {};
      return [
        csvField(sub.email),
        csvField(sub.name),
        csvField(sub.status),
        csvField(sub.gender),
        csvField(r.registered_at),
        csvField(r.source),
      ].join(",");
    })
    .join("\n");

  const csv = body.length > 0 ? `${header}\n${body}\n` : `${header}\n`;
  const filename = `event-${event.slug}-registrations.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
