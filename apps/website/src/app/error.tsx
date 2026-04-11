"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-brand text-bs-cream/20 text-[120px] leading-none">500</p>
      <h1 className="mt-4 font-brand text-xl tracking-widest uppercase text-bs-cream">
        QUALCOSA È ANDATO STORTO
      </h1>
      <p className="mt-3 text-sm text-bs-cream/60">
        Un errore imprevisto. Riprova tra qualche secondo.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center justify-center border border-bs-cream/20 px-6 min-h-[48px] font-brand text-xs uppercase tracking-widest text-bs-cream motion-safe:transition-colors hover:bg-bs-cream/5"
      >
        RIPROVA
      </button>
    </div>
  );
}
