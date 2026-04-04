"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ComposeEditor() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;

    const confirmed = window.confirm(
      `Stai per inviare la newsletter "${subject}" a tutti gli iscritti confermati. Confermi?`,
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult(`Errore: ${data.error}`);
      } else {
        setResult(`Inviata a ${data.sent}/${data.total} iscritti.`);
        setSubject("");
        setBody("");
      }
    } catch {
      setResult("Errore di rete.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="nl-subject" className="font-body text-xs text-bs-cream/40 mb-1 block">Oggetto</label>
        <input
          id="nl-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Oggetto della newsletter"
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/20"
        />
      </div>
      <div>
        <label htmlFor="nl-body" className="font-body text-xs text-bs-cream/40 mb-1 block">Contenuto (HTML)</label>
        <textarea
          id="nl-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Scrivi il contenuto della newsletter..."
          rows={12}
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/20 resize-y"
        />
      </div>
      <button
        onClick={handleSend}
        disabled={sending || !subject.trim() || !body.trim()}
        className="flex items-center justify-center gap-2 bg-bs-gold text-bs-black font-heading text-lg tracking-wider py-3 rounded-md hover:bg-bs-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Send size={18} />
        {sending ? "INVIO IN CORSO..." : "INVIA NEWSLETTER"}
      </button>
      {result && (
        <p className={`font-body text-sm text-center ${result.startsWith("Errore") ? "text-bs-burgundy" : "text-bs-green"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
