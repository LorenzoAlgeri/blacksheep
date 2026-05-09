import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RegistrationRow {
  registered_at: string | null;
  source: string | null;
  subscriber: {
    id: string;
    email?: string | null;
    name?: string | null;
    status?: string | null;
    gender?: string | null;
  } | null;
}

function sanitize(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/^[=+\-@\t\r\n]/.test(str)) return `'${str}`;
  return str;
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = getSupabase();

  const { data: event } = await supabase
    .from("list_events")
    .select("slug, title")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    return Response.json({ error: "Evento non trovato" }, { status: 404 });
  }

  const { data: regData, error: regError } = await supabase
    .from("list_event_registrations")
    .select("registered_at, source, subscriber:subscribers(id, email, name, status, gender)")
    .eq("event_id", id)
    .order("registered_at", { ascending: false });

  if (regError) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  const { data: attendanceData } = await supabase
    .from("event_attendance")
    .select("subscriber_id, attended_at")
    .eq("event_id", id);

  const attendanceMap = new Map(
    (attendanceData ?? []).map((a: { subscriber_id: string; attended_at: string }) => [
      a.subscriber_id,
      a.attended_at,
    ]),
  );

  const rows = (regData ?? []) as unknown as RegistrationRow[];
  const attendedTotal = rows.filter(
    (r) => r.subscriber && attendanceMap.has(r.subscriber.id),
  ).length;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Registrazioni");

  sheet.columns = [
    { header: "Email", key: "email", width: 30 },
    { header: "Nome", key: "name", width: 20 },
    { header: "Genere", key: "gender", width: 10 },
    { header: "Iscritto il", key: "registered_at", width: 18 },
    { header: "Fonte", key: "source", width: 12 },
    { header: "Presente", key: "attended", width: 10 },
    { header: "Presente alle", key: "attended_at", width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: "G1" };

  for (const r of rows) {
    const sub = r.subscriber;
    const subId = sub?.id;
    const attended = subId ? attendanceMap.has(subId) : false;

    sheet.addRow({
      email: sanitize(sub?.email),
      name: sanitize(sub?.name),
      gender: sub?.gender === "female" ? "Donna" : sub?.gender === "male" ? "Uomo" : "",
      registered_at: r.registered_at
        ? new Date(r.registered_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" })
        : "",
      source: sanitize(r.source),
      attended: attended ? "Si" : "No",
      attended_at:
        attended && subId
          ? new Date(attendanceMap.get(subId)!).toLocaleString("it-IT", { timeZone: "Europe/Rome" })
          : "",
    });
  }

  sheet.addRow({});
  sheet.addRow({
    email: `Iscritti: ${rows.length}`,
    name: `Presenti: ${attendedTotal}`,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `evento-${event.slug}-presenze.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
