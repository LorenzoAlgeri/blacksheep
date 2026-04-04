"use client";

export function SuccessMessage() {
  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in-scale">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        className="text-bs-green"
      >
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <path
          d="M14 24l7 7 13-13"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-checkmark"
        />
      </svg>
      <p className="font-[family-name:var(--font-brand)] text-2xl tracking-wider text-bs-cream">
        CI SEI
      </p>
      <p className="font-body text-sm text-bs-cream/50 text-center max-w-[260px]">
        Controlla la tua email e conferma l&apos;iscrizione.
      </p>
    </div>
  );
}
