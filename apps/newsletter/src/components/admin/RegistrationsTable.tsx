"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { calculateStats } from "@/lib/registration-stats";
import type { Registration } from "@/lib/registration-stats";

export type RegistrationRow = {
  id: string;
  registered_at: string | null;
  source: string | null;
  subscriber: {
    id: string;
    email: string | null;
    name: string | null;
    status: string | null;
    gender: string | null;
  } | null;
};

type Props = {
  registrations: RegistrationRow[];
  total: number;
  page: number;
  pageSize: number;
  eventId: string;
  csvHref: string;
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
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const stats = calculateStats(registrations as Registration[]);

  // eventId reserved for future use (e.g. back-link construction)
  void eventId;

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
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
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
      </div>

      {/* Controls: filter + CSV */}
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

        {/* CSV export */}
        <a
          href={csvHref}
          download
          className="font-body text-xs px-4 py-2 rounded border border-bs-cream/20 text-bs-cream/70 hover:text-bs-cream hover:border-bs-cream/40 transition-colors text-center"
        >
          ↓ ESPORTA CSV
        </a>
      </div>

      {/* Table */}
      {registrations.length === 0 ? (
        <p className="font-body text-bs-cream/30 text-center py-12">
          {total === 0
            ? "Nessuna registrazione ancora. Le iscrizioni appariranno qui appena gli utenti si registrano."
            : "Nessun risultato per questo filtro."}
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {registrations.map((reg) => (
              <div key={reg.id} className="bg-bs-cream/5 rounded-lg p-4 space-y-1.5">
                <p className="font-body text-sm text-bs-cream">{reg.subscriber?.email ?? "—"}</p>
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
                  <th scope="col" className="pb-2">
                    Sorgente
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-bs-cream/5">
                    <td className="py-2 pr-4 text-bs-cream">{reg.subscriber?.email ?? "—"}</td>
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
                    <td className="py-2 text-bs-cream/30">{reg.source ?? "—"}</td>
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
