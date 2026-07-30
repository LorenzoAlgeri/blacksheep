import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { basePath } from "@/lib/base-path";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import type { RegistrationRow } from "@/components/admin/RegistrationsTable";
import { calculateStats } from "@/lib/registration-stats";
import type { Registration } from "@/lib/registration-stats";
import { tallyEventCounts } from "@/lib/registration-counts";
import type { RegistrationCountRow } from "@/lib/registration-counts";

export const metadata: Metadata = {
  title: "Registrazioni — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

type AdminEvent = {
  id: string;
  title: string;
  slug: string;
  event_date: string;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
};

const PAGE_SIZE = 50;

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventRegistrationsPage({ params, searchParams }: PageProps) {
  // Auth guard
  const session = await auth();
  if (!session) notFound();

  const { id } = await params;
  const { page: pageParam, status: statusParam } = await searchParams;

  const page = Math.max(1, Number(pageParam) || 1);
  const statusFilter = (statusParam ?? "").trim();
  const pageSize = PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const supabase = getSupabase();

  // Fetch event metadata
  const { data: eventData } = await supabase
    .from("list_events")
    .select("id, title, slug, event_date")
    .eq("id", id)
    .maybeSingle();

  if (!eventData) notFound();
  const event = eventData as AdminEvent;

  // Fetch ALL registrations for this event (with subscriber details), paginating
  // past PostgREST's per-request row cap. We need the full set — not a single
  // page — so the stat cards reflect the whole event, not just the visible page.
  const CHUNK = 1000;
  const allData: RegistrationRow[] = [];
  let fetchFrom = 0;
  let error: { message: string } | null = null;
  for (;;) {
    const { data, error: pageError } = await supabase
      .from("list_event_registrations")
      .select("id, registered_at, source, subscriber:subscribers(id, email, name, status, gender)")
      .eq("event_id", id)
      .order("registered_at", { ascending: false })
      .range(fetchFrom, fetchFrom + CHUNK - 1);
    if (pageError) {
      error = pageError;
      break;
    }
    const rows = (data ?? []) as unknown as RegistrationRow[];
    allData.push(...rows);
    if (rows.length < CHUNK) break;
    fetchFrom += CHUNK;
  }

  if (error) {
    console.error("[ADMIN_REG_PAGE] fetch error:", error.message);
  }

  // Fetch attendance data for this event (all rows, for the per-row toggles).
  const { data: attendanceData } = await supabase
    .from("event_attendance")
    .select("subscriber_id, attended_at")
    .eq("event_id", id);

  // Whole-event attendance count (exact, server-side) for the "Presenti" card.
  const { count: attendedCount } = await supabase
    .from("event_attendance")
    .select("subscriber_id", { count: "exact", head: true })
    .eq("event_id", id);

  const attendanceMap = new Map(
    (attendanceData ?? []).map((a: { subscriber_id: string; attended_at: string }) => [
      a.subscriber_id,
      a.attended_at as string,
    ]),
  );

  // Per-subscriber total event registrations (all-time, every event). Fetched
  // for just the subscribers on this event, in id-chunks with pagination.
  const subscriberIds = [
    ...new Set(allData.map((r) => r.subscriber?.id).filter((v): v is string => !!v)),
  ];
  const countRows: RegistrationCountRow[] = [];
  const ID_CHUNK = 200;
  for (let i = 0; i < subscriberIds.length; i += ID_CHUNK) {
    const idChunk = subscriberIds.slice(i, i + ID_CHUNK);
    let countFrom = 0;
    for (;;) {
      const { data: cData, error: countError } = await supabase
        .from("list_event_registrations")
        .select("subscriber_id")
        .in("subscriber_id", idChunk)
        .range(countFrom, countFrom + CHUNK - 1);
      if (countError) {
        console.error("[ADMIN_REG_PAGE] count fetch error:", countError.message);
        break;
      }
      const rows = (cData ?? []) as RegistrationCountRow[];
      countRows.push(...rows);
      if (rows.length < CHUNK) break;
      countFrom += CHUNK;
    }
  }
  const eventCounts = tallyEventCounts(countRows);

  const all: RegistrationRow[] = ((allData ?? []) as unknown as RegistrationRow[]).map((r) => ({
    ...r,
    attended: r.subscriber ? attendanceMap.has(r.subscriber.id) : false,
    attended_at: r.subscriber ? (attendanceMap.get(r.subscriber.id) ?? null) : null,
    eventCount: r.subscriber ? (eventCounts.get(r.subscriber.id) ?? 0) : null,
  }));

  // Whole-event aggregate stats (over ALL registrations, ignoring the status
  // filter and pagination) so the stat cards show the real event totals.
  const stats = calculateStats(all as unknown as Registration[]);

  // Filter by status client-side (server-side, but within the component)
  const filtered =
    statusFilter === "confirmed"
      ? all.filter((r) => r.subscriber?.status === "confirmed")
      : statusFilter === "pending"
        ? all.filter((r) => r.subscriber?.status !== "confirmed")
        : all;

  // Paginate filtered results
  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + pageSize);

  const csvHref = `${basePath}/api/admin/events/${id}/registrations/export.csv`;
  const xlsxHref = `${basePath}/api/admin/events/${id}/registrations/export.xlsx`;

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Navigazione">
        <Link
          href="/admin/events"
          className="font-body text-xs text-bs-cream/40 hover:text-bs-cream/70 transition-colors"
        >
          ← Eventi
        </Link>
        <span className="font-body text-xs text-bs-cream/20 mx-2">/</span>
        <Link
          href={`/admin/events/${id}`}
          className="font-body text-xs text-bs-cream/40 hover:text-bs-cream/70 transition-colors"
        >
          {event.title}
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream mb-1">
          REGISTRAZIONI
        </h1>
        <p className="font-body text-sm text-bs-cream/50">
          {event.title} &mdash; {formatEventDate(event.event_date)}
        </p>
      </div>

      <RegistrationsTable
        registrations={paginated}
        total={total}
        page={page}
        pageSize={pageSize}
        eventId={id}
        csvHref={csvHref}
        xlsxHref={xlsxHref}
        stats={stats}
        attendedCount={attendedCount ?? 0}
      />
    </div>
  );
}
