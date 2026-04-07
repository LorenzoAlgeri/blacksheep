import Image from "next/image";
import Link from "next/link";
import { ConfirmMotion } from "@/components/ConfirmMotion";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ already?: string }>;
}) {
  const { already } = await searchParams;

  return (
    <ConfirmMotion>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Logo */}
        <div data-confirm="logo">
          <Image
            src="/bs-logo.svg"
            alt="BLACK SHEEP"
            width={100}
            height={65}
            className="opacity-60"
            style={{
              height: "auto",
              filter:
                "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)",
            }}
          />
        </div>

        {/* Title */}
        <h1
          data-confirm="title"
          className="font-[family-name:var(--font-brand)] text-4xl tracking-wider text-bs-cream mt-8 confirm-title-glow"
        >
          {already ? "GIÀ CON NOI" : "SEI DEI NOSTRI"}
        </h1>

        {/* Divider */}
        <div data-confirm="divider" className="w-full max-w-[200px] mt-6 mb-6">
          <div className="h-px bg-gradient-to-r from-transparent via-bs-cream/15 to-transparent" />
        </div>

        {/* Subtitle */}
        <p
          data-confirm="subtitle"
          className="font-body text-sm text-bs-cream/60 max-w-xs leading-relaxed"
        >
          {already
            ? "La tua email è già confermata. Ci vediamo presto."
            : "Iscrizione confermata. Riceverai tutti gli aggiornamenti per le prossime date in anteprima."}
        </p>

        {/* Back link */}
        <Link
          href="/"
          data-confirm="back"
          className="font-body text-[10px] text-bs-cream/20 uppercase tracking-[0.2em] mt-10 hover:text-bs-cream/50 transition-colors duration-300"
        >
          Torna al sito
        </Link>
      </main>
    </ConfirmMotion>
  );
}
