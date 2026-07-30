"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { basePath } from "@/lib/base-path";
import { calculateStats } from "@/lib/registration-stats";
import type { Registration, RegistrationStats } from "@/lib/registration-stats";

export type RegistrationRow = {
  id: string;
  registered_at: string | null;
  source: string | null;
  attended: boolean;
  attended_at: string | null;
  subscriber: {
    id: string;
    email: string | null;
    name: string | null;
    status: string | null;
    gender: string | null;
  } | null;
  /** Total events this subscriber has registered for, across ALL events (all-time). */
  eventCount?: number | null;
};

type Props = {
  registrations: RegistrationRow[];
  total: number;
  page: number;
  pageSize: number;
  eventId: string;
  csvHref: string;
  xlsxHref: string;
  /**
   * Whole-event aggregate stats, computed server-side over ALL registrations.
   * When omitted, falls back to computing over the (paginated) `registrations`
   * prop — kept only for backward compatibility; callers should always pass this
   * so the stat cards reflect the full event, not the current page.
   */
  stats?: RegistrationStats;
  /** Whole-event attendance count, computed server-side. Falls back to the page. */
  attendedCount?: number;
};

const STATUS_FILTERS = [
  { value: "", label: "TUTTI" },
  { value: "confirmed", label: "CONFERMATI" },
  { value: "pending", label: "IN ATTESA" },
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventCountBadge({ count }: { count?: number | null }) {
  if (typeof count !== "number") return null;
  const label = `Iscrizioni a eventi totali: ${count}`;
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full bg-bs-cream/10 px-2 py-0.5 font-body text-[10px] text-bs-cream/70"
    >
      <Ticket size={11} aria-hidden="true" />
      {count}
    </span>
  );
}

function GenderLabel({ gender }: { gender: string | null }) {
  if (gender === "female") return <span className="text-bs-cream/80">Donna</span>;
  if (gender === "male") return <span className="text-bs-cream/60">Uomo</span>;
  return <span className="text-bs-cream/30">—</span>;
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "confirmed") {
    return (
      <span className="text-bs-green text-xs font-body" aria-label="Confermato">
        ✓ Confermato
      </span>
    );
  }
  return (
    <span className="text-bs-cream/40 text-xs font-body" aria-label="In attesa">
      ⏳ In attesa
    </span>
  );
}

export function RegistrationsTable({
  registrations,
  total,
  page,
  pageSize,
  eventId,
  csvHref,
  xlsxHref,
  stats: statsProp,
  attendedCount: attendedCountProp,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";
  const [searchQuery, setSearchQuery] = useState("");

  const visibleRegistrations = searchQuery.trim()
    ? registrations.filter((r) => {
        const q = searchQuery.toLowerCase();
        return (
          r.subscriber?.email?.toLowerCase().includes(q) ||
          r.subscriber?.name?.toLowerCase().includes(q)
        );
      })
    : registrations;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Prefer whole-event stats from the server; fall back to the page only if
  // they were not provided (keeps the component usable in isolation/tests).
  const stats = statsProp ?? calculateStats(registrations as Registration[]);
  const attendedCount = attendedCountProp ?? registrations.filter((r) => r.attended).length;

  async function handleToggleAttendance(subscriberId: string | undefined) {
    if (!subscriberId) return;
    try {
      const res = await fetch(`${basePath}/api/admin/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId }),
      });
      if (res.ok) router.refresh();
    } catch {
      // Page refresh will show correct state
    }
  }

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "") params.delete("status");
    else params.set("status", value);
    params.delete("page"); // reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      {/* Stats cards */}
      <div
        className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8"
        aria-label="Statistiche registrazioni"
        aria-live="polite"
      >
        <div className="bg-bs-cream/5 rounded-lg p-4">
          <p className="font-body text-xs text-bs-cream/40 uppercase tracking-widest mb-1">
            Totale
          </p>
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">
            {stats.total}
          </p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4">
          <p className="font-body text-xs text-bs-cream/40 uppercase tracking-widest mb-1">
            Confermati
          </p>
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-green">
            {stats.confirmed}
          </p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 border border-bs-cream/10">
          <p className="font-body text-xs text-bs-cream/40 uppercase tracking-widest mb-1">
            Donne (omaggio)
          </p>
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">
            {stats.womenConfirmed}
          </p>
          <p className="font-body text-[10px] text-bs-cream/30 mt-0.5">{stats.women} totali</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4">
          <p className="font-body text-xs text-bs-cream/40 uppercase tracking-widest mb-1">
            In attesa
          </p>
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream/50">
            {stats.pending}
          </p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 border border-bs-green/20">
          <p className="font-body text-xs text-bs-cream/40 uppercase tracking-widest mb-1">
            Presenti
          </p>
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-green">
            {attendedCount}
          </p>
        </div>
      </div>

      {/* Search box */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Cerca per email o nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-3 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/30 focus:outline-none focus:border-bs-cream/40"
          aria-label="Cerca registrazioni"
        />
      </div>

      {/* Controls: filter + export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        {/* Status filter */}
        <div className="flex gap-1" role="group" aria-label="Filtra per status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`font-body text-xs px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                currentStatus === f.value
                  ? "border-bs-cream/40 text-bs-cream bg-bs-cream/10"
                  : "border-bs-cream/10 text-bs-cream/50 hover:text-bs-cream hover:border-bs-cream/20"
              }`}
              aria-pressed={currentStatus === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <a
            href={csvHref}
            download
            className="font-body text-xs px-4 py-2 rounded border border-bs-cream/20 text-bs-cream/70 hover:text-bs-cream hover:border-bs-cream/40 transition-colors text-center"
          >
            ↓ ESPORTA CSV
          </a>
          <a
            href={xlsxHref}
            download
            className="font-body text-xs px-4 py-2 rounded border border-bs-cream/20 text-bs-cream/70 hover:text-bs-cream hover:border-bs-cream/40 transition-colors text-center"
          >
            ↓ ESPORTA EXCEL
          </a>
        </div>
      </div>

      {/* Table */}
      {visibleRegistrations.length === 0 ? (
        <p className="font-body text-bs-cream/30 text-center py-12">
          {total === 0
            ? "Nessuna registrazione ancora. Le iscrizioni appariranno qui appena gli utenti si registrano."
            : searchQuery.trim()
              ? "Nessun risultato per questa ricerca."
              : "Nessun risultato per questo filtro."}
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {visibleRegistrations.map((reg) => (
              <div key={reg.id} className="bg-bs-cream/5 rounded-lg p-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-body text-sm text-bs-cream">{reg.subscriber?.email ?? "—"}</p>
                  <EventCountBadge count={reg.eventCount} />
                </div>
                {reg.subscriber?.name && (
                  <p className="font-body text-xs text-bs-cream/50">{reg.subscriber.name}</p>
                )}
                <div className="flex items-center gap-3">
                  <StatusBadge status={reg.subscriber?.status ?? null} />
                  <GenderLabel gender={reg.subscriber?.gender ?? null} />
                </div>
                <p className="font-body text-xs text-bs-cream/30">
                  {formatDate(reg.registered_at)}
                </p>
                <button
                  type="button"
                  onClick={() => handleToggleAttendance(reg.subscriber?.id)}
                  className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-md font-body text-xs transition-colors cursor-pointer ${
                    reg.attended
                      ? "bg-bs-green/20 text-bs-green border border-bs-green/30"
                      : "bg-bs-cream/5 text-bs-cream/40 border border-bs-cream/10 hover:border-bs-cream/30"
                  }`}
                  aria-pressed={reg.attended}
                  aria-label={reg.attended ? "Rimuovi presenza" : "Segna presente"}
                >
                  {reg.attended ? "✓ Presente" : "Presente"}
                </button>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full font-body text-xs" aria-label="Lista registrazioni">
              <thead>
                <tr className="text-bs-cream/50 text-left border-b border-bs-cream/10">
                  <th scope="col" className="pb-2 pr-4">
                    Email
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Nome
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Genere
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Status
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Data
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Sorgente
                  </th>
                  <th scope="col" className="pb-2">
                    Presenza
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRegistrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-bs-cream/5">
                    <td className="py-2 pr-4 text-bs-cream">
                      <span className="inline-flex items-center gap-2">
                        {reg.subscriber?.email ?? "—"}
                        <EventCountBadge count={reg.eventCount} />
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-bs-cream/60">{reg.subscriber?.name ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <GenderLabel gender={reg.subscriber?.gender ?? null} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={reg.subscriber?.status ?? null} />
                    </td>
                    <td className="py-2 pr-4 text-bs-cream/40 whitespace-nowrap">
                      {formatDate(reg.registered_at)}
                    </td>
                    <td className="py-2 pr-4 text-bs-cream/30">{reg.source ?? "—"}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAttendance(reg.subscriber?.id)}
                        className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-md font-body text-xs transition-colors cursor-pointer ${
                          reg.attended
                            ? "bg-bs-green/20 text-bs-green border border-bs-green/30"
                            : "bg-bs-cream/5 text-bs-cream/40 border border-bs-cream/10 hover:border-bs-cream/30"
                        }`}
                        aria-pressed={reg.attended}
                        aria-label={reg.attended ? "Rimuovi presenza" : "Segna presente"}
                      >
                        {reg.attended ? "✓ Presente" : "Presente"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-body text-xs text-bs-cream/40">
                Pagina {page} di {totalPages} &middot; {total} registrazioni totali
              </p>
              <div className="flex gap-2">
                <Link
                  href={buildHref({ page: String(page - 1) })}
                  aria-disabled={page === 1}
                  className={`font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors ${
                    page === 1 ? "pointer-events-none opacity-40" : ""
                  }`}
                >
                  Precedente
                </Link>
                <Link
                  href={buildHref({ page: String(page + 1) })}
                  aria-disabled={page >= totalPages}
                  className={`font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors ${
                    page >= totalPages ? "pointer-events-none opacity-40" : ""
                  }`}
                >
                  Successiva
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
