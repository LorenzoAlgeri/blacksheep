import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { basePath } from "@/lib/base-path";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import type { RegistrationRow } from "@/components/admin/RegistrationsTable";

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
const MAX_PAGE_SIZE = 200;

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

  // Fetch all registrations for this event (with subscriber details)
  // then filter by subscriber status if requested.
  // We over-fetch to compute stats accurately for the current status filter
  // without a second round trip: always fetch without status limit, then filter.
  const { data: allData, error } = await supabase
    .from("list_event_registrations")
    .select("id, registered_at, source, subscriber:subscribers(id, email, name, status, gender)", {
      count: "exact",
    })
    .eq("event_id", id)
    .order("registered_at", { ascending: false })
    .range(0, MAX_PAGE_SIZE - 1);

  if (error) {
    console.error("[ADMIN_REG_PAGE] fetch error:", error.message);
  }

  // Fetch attendance data for this event
  const { data: attendanceData } = await supabase
    .from("event_attendance")
    .select("subscriber_id, attended_at")
    .eq("event_id", id);

  const attendanceMap = new Map(
    (attendanceData ?? []).map((a: { subscriber_id: string; attended_at: string }) => [
      a.subscriber_id,
      a.attended_at as string,
    ]),
  );

  const all: RegistrationRow[] = ((allData ?? []) as unknown as RegistrationRow[]).map((r) => ({
    ...r,
    attended: r.subscriber ? attendanceMap.has(r.subscriber.id) : false,
    attended_at: r.subscriber ? (attendanceMap.get(r.subscriber.id) ?? null) : null,
  }));

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
      />
    </div>
  );
}
