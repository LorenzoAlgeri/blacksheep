"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle, Pencil, Archive, Trash2 } from "lucide-react";
import { basePath } from "@/lib/base-path";
import { Dialog } from "@/components/dialog/Dialog";
import { DialogHeader } from "@/components/dialog/DialogHeader";
import { DialogContent } from "@/components/dialog/DialogContent";
import { DialogFooter } from "@/components/dialog/DialogFooter";

type AdminEvent = {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  venue: string;
  description: string | null;
  capacity: number | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string | null;
  created_by: string | null;
};

type ApiResponse = {
  events: AdminEvent[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 20;

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventStatusBadge({ status }: { status: AdminEvent["status"] }) {
  if (status === "published") {
    return (
      <span className="text-bs-green flex items-center gap-1 text-xs flex-shrink-0">
        <CheckCircle size={12} /> Pubblicato
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="text-bs-cream/50 flex items-center gap-1 text-xs flex-shrink-0">
        <Pencil size={12} /> Bozza
      </span>
    );
  }
  return (
    <span className="text-bs-cream/20 flex items-center gap-1 text-xs flex-shrink-0">
      <Archive size={12} /> Archiviato
    </span>
  );
}

export function EventsTable() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminEvent | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchEvents = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${basePath}/api/admin/events?page=${page}&pageSize=${PAGE_SIZE}&sort=event_date_desc`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        setEvents(data.events ?? []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setLoading(false);
      })
      .catch(() => {
        setError("Errore nel caricamento degli eventi.");
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(timer);
  }, [banner]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      const res = await fetch(`${basePath}/api/admin/events/${archiveTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setArchiveTarget(null);
        setBanner({ type: "success", message: "Evento archiviato." });
        fetchEvents();
      } else {
        setArchiveTarget(null);
        setBanner({ type: "error", message: "Errore durante l'archiviazione. Riprova." });
      }
    } catch {
      setArchiveTarget(null);
      setBanner({ type: "error", message: "Errore di rete. Riprova." });
    } finally {
      setArchiveLoading(false);
    }
  };

  if (loading) {
    return <p className="font-body text-bs-cream/50 text-center py-12">Caricamento...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-bs-burgundy mb-4">{error}</p>
        <button
          onClick={fetchEvents}
          className="font-body text-sm text-bs-cream/60 underline hover:text-bs-cream cursor-pointer"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div>
      {banner && (
        <div
          className={`mb-4 px-4 py-3 rounded font-body text-xs ${
            banner.type === "success"
              ? "bg-bs-green/10 text-bs-green border border-bs-green/20"
              : "bg-bs-burgundy/10 text-bs-burgundy border border-bs-burgundy/20"
          }`}
        >
          {banner.message}
        </div>
      )}

      {events.length === 0 ? (
        <p className="font-body text-bs-cream/30 text-center py-8">
          Nessun evento.{" "}
          <Link
            href="/admin/events/new"
            className="underline hover:text-bs-cream/60 transition-colors"
          >
            Crea il primo &rarr;
          </Link>
        </p>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {events.map((event) => (
              <div key={event.id} className="bg-bs-cream/5 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-body text-sm text-bs-cream">{event.title}</p>
                  <EventStatusBadge status={event.status} />
                </div>
                <p className="font-body text-xs text-bs-cream/40">{event.venue}</p>
                <p className="font-body text-xs text-bs-cream/40">
                  {formatEventDate(event.event_date)}
                </p>
                {event.capacity !== null && (
                  <p className="font-body text-xs text-bs-cream/40">Cap. {event.capacity}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/admin/events/${event.id}`}
                    title="Modifica"
                    className="p-1.5 rounded text-bs-cream/40 hover:text-bs-cream hover:bg-bs-cream/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => setArchiveTarget(event)}
                    title="Archivia"
                    className="p-1.5 rounded text-bs-cream/40 hover:text-bs-burgundy hover:bg-bs-burgundy/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full font-body text-xs">
              <thead>
                <tr className="text-bs-cream/50 text-left border-b border-bs-cream/10">
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2 pr-4">Titolo</th>
                  <th className="pb-2 pr-4">Venue</th>
                  <th className="pb-2 pr-4">Cap.</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-bs-cream/5">
                    <td className="py-2 pr-4 text-bs-cream/40 whitespace-nowrap">
                      {formatEventDate(event.event_date)}
                    </td>
                    <td className="py-2 pr-4 text-bs-cream">{event.title}</td>
                    <td className="py-2 pr-4 text-bs-cream/60">{event.venue}</td>
                    <td className="py-2 pr-4 text-bs-cream/40">
                      {event.capacity !== null ? event.capacity : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <EventStatusBadge status={event.status} />
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/events/${event.id}`}
                          title="Modifica"
                          className="p-1.5 rounded text-bs-cream/40 hover:text-bs-cream hover:bg-bs-cream/10 transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => setArchiveTarget(event)}
                          title="Archivia"
                          className="p-1.5 rounded text-bs-cream/40 hover:text-bs-burgundy hover:bg-bs-burgundy/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-body text-xs text-bs-cream/40">
                Pagina {page} di {totalPages} &middot; {total} eventi totali
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Precedente
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Successiva
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        ariaLabelledBy="archive-event-title"
        ariaDescribedBy="archive-event-desc"
      >
        <DialogHeader id="archive-event-title">ARCHIVIARE EVENTO?</DialogHeader>
        <DialogContent id="archive-event-desc">
          {archiveTarget
            ? `L'evento "${archiveTarget.title}" verrà archiviato. Puoi ripristinarlo modificando lo status.`
            : ""}
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => setArchiveTarget(null)}
            disabled={archiveLoading}
            className="font-body text-xs text-bs-cream/50 px-4 py-2 rounded hover:text-bs-cream transition-colors disabled:opacity-50 cursor-pointer"
          >
            ANNULLA
          </button>
          <button
            onClick={handleArchive}
            disabled={archiveLoading}
            className="font-body text-xs text-bs-cream bg-bs-burgundy/40 px-4 py-2 rounded hover:bg-bs-burgundy/60 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {archiveLoading ? "Archiviazione..." : "ARCHIVIA"}
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
