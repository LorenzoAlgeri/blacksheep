"use client";

import { useCallback, useEffect, useState } from "react";
import { basePath } from "@/lib/base-path";

type CampaignHistoryItem = {
  id: string;
  subject: string;
  source: string;
  recipientCount: number;
  sentCount: number;
  pendingCount: number;
  uniqueOpens: number;
  openRate: number;
  sentAt: string | null;
  createdAt: string | null;
  canResume: boolean;
  hasStoredHtml: boolean;
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

function statusLabel(row: CampaignHistoryItem): string {
  if (row.recipientCount === 0) return "—";
  if (row.canResume) return `Parziale · ${row.pendingCount} mancanti`;
  return "Completata";
}

export function NewsletterHistory() {
  const [rows, setRows] = useState<CampaignHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${basePath}/api/admin/newsletter-history`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Errore caricamento storico.");
        setRows([]);
      } else {
        setRows(payload.history ?? []);
      }
    } catch {
      setError("Errore caricamento storico.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) setRows([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleResume = useCallback(
    async (row: CampaignHistoryItem) => {
      const confirmed = window.confirm(
        `Riprendi l'invio di "${row.subject}"? Verranno inviate le email solo ai ${row.pendingCount} destinatari mancanti.`,
      );
      if (!confirmed) return;

      let html: string | undefined;
      let subject: string | undefined;
      if (!row.hasStoredHtml) {
        const pasted = window.prompt(
          "Questa campagna è stata creata prima del tracking per-destinatario.\nIncolla qui l'HTML originale (verrà salvato per i prossimi resume).",
        );
        if (!pasted || pasted.trim().length === 0) return;
        html = pasted;
        const subjectOverride = window.prompt("Conferma o modifica l'oggetto:", row.subject);
        if (subjectOverride && subjectOverride.trim().length > 0) subject = subjectOverride;
      }

      setBusyId(row.id);
      setFeedback(null);
      try {
        const response = await fetch(
          `${basePath}/api/admin/send/${encodeURIComponent(row.id)}/resume`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: html ? JSON.stringify({ html, subject }) : "{}",
          },
        );
        const payload = await response.json();
        if (!response.ok) {
          setFeedback(`Errore: ${payload.error ?? response.statusText}`);
        } else {
          const { delivered, retryable, failed, status, sent, total } = payload as {
            delivered: number;
            retryable: number;
            failed: number;
            status: string;
            sent: number;
            total: number;
          };
          const statusBit =
            status === "complete" ? "completata" : `parziale (${total - sent} ancora da inviare)`;
          setFeedback(
            `Resume ${statusBit}: ${delivered} consegnate, ${retryable} da riprovare, ${failed} fallite definitivamente.`,
          );
          await load();
        }
      } catch {
        setFeedback("Errore di rete durante il resume.");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  return (
    <section className="mt-10">
      <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.22em] text-bs-cream mb-3">
        STORICO APERTURE NEWSLETTER
      </h2>

      {feedback && (
        <p className="font-body text-xs text-bs-cream/70 mb-2" role="status">
          {feedback}
        </p>
      )}

      <div className="border border-bs-cream/10 rounded-lg overflow-hidden">
        {loading && <p className="font-body text-sm text-bs-cream/35 p-4">Caricamento...</p>}

        {!loading && error && <p className="font-body text-sm text-bs-burgundy p-4">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="font-body text-sm text-bs-cream/35 p-4">Nessun invio ancora tracciato.</p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] font-body text-xs">
              <thead>
                <tr className="text-left text-bs-cream/45 border-b border-bs-cream/10">
                  <th className="py-2 px-3">Data invio</th>
                  <th className="py-2 px-3">Oggetto</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">Aperti</th>
                  <th className="py-2 px-3">Registrati al momento invio</th>
                  <th className="py-2 px-3">Consegnati</th>
                  <th className="py-2 px-3">Stato</th>
                  <th className="py-2 px-3">Open rate</th>
                  <th className="py-2 px-3">Azioni</th>
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
                    <td
                      className={`py-2 px-3 whitespace-nowrap ${
                        row.canResume ? "text-bs-burgundy" : "text-bs-green"
                      }`}
                    >
                      {statusLabel(row)}
                    </td>
                    <td className="py-2 px-3 text-bs-green whitespace-nowrap">{row.openRate}%</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {row.canResume ? (
                        <button
                          type="button"
                          onClick={() => handleResume(row)}
                          disabled={busyId === row.id}
                          className="px-2 py-1 border border-bs-cream/30 rounded text-bs-cream hover:bg-bs-cream/10 disabled:opacity-40"
                        >
                          {busyId === row.id ? "Riprendo..." : "Riprendi"}
                        </button>
                      ) : (
                        <span className="text-bs-cream/30">—</span>
                      )}
                    </td>
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
