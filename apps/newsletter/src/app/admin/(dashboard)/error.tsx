"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream">
        ERRORE
      </h2>
      <p className="font-body text-sm text-bs-cream/50 mt-3 max-w-xs">
        {error.message || "Qualcosa non ha funzionato."}
      </p>
      <button
        onClick={reset}
        className="mt-6 font-[family-name:var(--font-brand)] text-xs tracking-[0.15em] text-black bg-bs-cream px-6 py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
      >
        RIPROVA
      </button>
    </div>
  );
}
