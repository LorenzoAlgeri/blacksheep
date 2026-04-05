"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-black px-6 text-center">
      <h1 className="font-[family-name:var(--font-brand)] text-4xl tracking-wider text-bs-cream">
        ERRORE
      </h1>
      <p className="font-body text-sm text-bs-cream/50 mt-4 max-w-xs">
        Qualcosa non ha funzionato. Riprova tra qualche istante.
      </p>
      {error.digest && (
        <p className="font-body text-[10px] text-bs-cream/20 mt-2 font-mono">
          {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-8 font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-black bg-bs-cream px-8 py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
      >
        RIPROVA
      </button>
    </div>
  );
}
