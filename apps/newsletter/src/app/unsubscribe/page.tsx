"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { basePath } from "@/lib/base-path";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteData() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/unsubscribe?gdpr=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Errore. Riprova.");
        return;
      }
      setDeleted(true);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  if (deleted) {
    return (
      <>
        <h1 className="font-[family-name:var(--font-brand)] text-3xl tracking-wider text-bs-cream mb-4">
          DATI CANCELLATI
        </h1>
        <p className="font-body text-bs-cream/50 text-base max-w-xs">
          Tutti i tuoi dati sono stati eliminati in modo permanente, come previsto dal GDPR (Art.
          17).
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-[family-name:var(--font-brand)] text-3xl tracking-wider text-bs-cream mb-4">
        DISISCRITTO
      </h1>
      <p className="font-body text-bs-cream/50 text-base max-w-xs">
        Non riceverai pi&ugrave; le nostre email. Se cambi idea, puoi sempre reiscriverti dalla
        pagina principale.
      </p>

      {token && (
        <div className="mt-8 border-t border-bs-cream/10 pt-6 max-w-xs">
          <p className="font-body text-bs-cream/40 text-sm mb-4">
            Vuoi cancellare tutti i tuoi dati? Questa azione &egrave; irreversibile (GDPR Art. 17).
          </p>
          <button
            onClick={handleDeleteData}
            disabled={loading}
            className="w-full bg-bs-burgundy/20 text-bs-cream/70 font-body text-sm py-3 px-4 rounded-md hover:bg-bs-burgundy/30 transition-colors disabled:opacity-50 cursor-pointer border border-bs-burgundy/30"
          >
            {loading ? "Cancellazione..." : "Cancella tutti i miei dati"}
          </button>
          {error && <p className="font-body text-xs text-bs-burgundy text-center mt-2">{error}</p>}
        </div>
      )}
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Image
        src="/bs-logo.svg"
        alt="BLACK SHEEP"
        width={80}
        height={52}
        className="mb-6 opacity-30"
        style={{
          height: "auto",
          filter:
            "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)",
        }}
      />
      <Suspense fallback={<p className="font-body text-bs-cream/30">Caricamento...</p>}>
        <UnsubscribeContent />
      </Suspense>
    </main>
  );
}
