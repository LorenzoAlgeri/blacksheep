"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [tagline, setTagline] = useState("");
  const [venue, setVenue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((data) => {
        setTagline(data.tagline ?? "");
        setVenue(data.venue ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagline, venue }),
    });

    if (res.ok) {
      setFeedback("Salvato!");
      setTimeout(() => setFeedback(null), 3000);
    } else {
      const err = await res.json();
      setFeedback(err.error ?? "Errore nel salvataggio");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="font-body text-sm text-bs-cream/40">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="font-[family-name:var(--font-brand)] text-lg tracking-wider text-bs-cream mb-6">
        IMPOSTAZIONI SITO
      </h1>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label
            htmlFor="tagline"
            className="block font-body text-xs text-bs-cream/50 mb-1.5 tracking-wide uppercase"
          >
            Tagline (es. &quot;EVERY MONDAY&quot;)
          </label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={100}
            className="w-full rounded border border-bs-cream/10 bg-bs-cream/5 px-3 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/20 focus:border-bs-cream/30 focus:outline-none transition-colors"
            placeholder="EVERY MONDAY"
          />
        </div>

        <div>
          <label
            htmlFor="venue"
            className="block font-body text-xs text-bs-cream/50 mb-1.5 tracking-wide uppercase"
          >
            Venue (es. &quot;11 Clubroom · Corso Como · Milano&quot;)
          </label>
          <input
            id="venue"
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            maxLength={200}
            className="w-full rounded border border-bs-cream/10 bg-bs-cream/5 px-3 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/20 focus:border-bs-cream/30 focus:outline-none transition-colors"
            placeholder="11 Clubroom · Corso Como · Milano"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-bs-cream/10 px-5 py-2 font-body text-xs text-bs-cream tracking-wide uppercase hover:bg-bs-cream/20 disabled:opacity-40 transition-colors"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>

          {feedback && (
            <span
              className={`font-body text-xs transition-opacity ${
                feedback === "Salvato!" ? "text-green-400" : "text-red-400"
              }`}
            >
              {feedback}
            </span>
          )}
        </div>
      </form>

      <p className="mt-8 font-body text-[10px] text-bs-cream/20">
        Le modifiche saranno visibili sulla landing page al prossimo caricamento.
      </p>
    </div>
  );
}
