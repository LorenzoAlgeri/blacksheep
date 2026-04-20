"use client";

import { useEffect, useState } from "react";
import { basePath } from "@/lib/base-path";

type CampaignHistoryItem = {
  id: string;
  subject: string;
  source: string;
  recipientCount: number;
  sentCount: number;
  uniqueOpens: number;
  openRate: number;
  sentAt: string | null;
  createdAt: string | null;
};

function formatDateTime(value: string | null): string {
  if (!value) return "In coda";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(source: string): string {
  return source === "scheduled" ? "Programmato" : "Manuale";
}

export function NewsletterHistory() {
  const [rows, setRows] = useState<CampaignHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${basePath}/api/admin/newsletter-history`);
        const payload = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setError(payload.error ?? "Errore caricamento storico.");
            setRows([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setRows(payload.history ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Errore caricamento storico.");
          setRows([]);
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-10">
      <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.22em] text-bs-cream mb-3">
        STORICO APERTURE NEWSLETTER
      </h2>

      <div className="border border-bs-cream/10 rounded-lg overflow-hidden">
        {loading && <p className="font-body text-sm text-bs-cream/35 p-4">Caricamento...</p>}

        {!loading && error && <p className="font-body text-sm text-bs-burgundy p-4">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="font-body text-sm text-bs-cream/35 p-4">Nessun invio ancora tracciato.</p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] font-body text-xs">
              <thead>
                <tr className="text-left text-bs-cream/45 border-b border-bs-cream/10">
                  <th className="py-2 px-3">Data invio</th>
                  <th className="py-2 px-3">Oggetto</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">Aperti</th>
                  <th className="py-2 px-3">Registrati al momento invio</th>
                  <th className="py-2 px-3">Consegnati</th>
                  <th className="py-2 px-3">Open rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-bs-cream/5 last:border-b-0">
                    <td className="py-2 px-3 text-bs-cream/55 whitespace-nowrap">
                      {formatDateTime(row.sentAt ?? row.createdAt)}
                    </td>
                    <td
                      className="py-2 px-3 text-bs-cream max-w-[300px] truncate"
                      title={row.subject}
                    >
                      {row.subject}
                    </td>
                    <td className="py-2 px-3 text-bs-cream/55 whitespace-nowrap">
                      {sourceLabel(row.source)}
                    </td>
                    <td className="py-2 px-3 text-bs-cream whitespace-nowrap">{row.uniqueOpens}</td>
                    <td className="py-2 px-3 text-bs-cream whitespace-nowrap">
                      {row.recipientCount}
                    </td>
                    <td className="py-2 px-3 text-bs-cream/70 whitespace-nowrap">
                      {row.sentCount}
                    </td>
                    <td className="py-2 px-3 text-bs-green whitespace-nowrap">{row.openRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
