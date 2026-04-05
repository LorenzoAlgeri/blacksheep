import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 min-h-dvh">
      <div className="text-center space-y-6">
        <p className="font-[family-name:var(--font-brand)] text-[10px] tracking-[0.45em] text-bs-cream/30 uppercase">
          Every Monday
        </p>
        <h1 className="font-[family-name:var(--font-brand)] text-6xl tracking-[0.02em] text-bs-cream leading-none">
          404
        </h1>
        <p className="font-body text-sm text-bs-cream/50 max-w-[260px] mx-auto">
          Questa pagina non esiste. Forse ti sei perso nel buio.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-block bg-bs-cream text-black font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] px-8 py-3 rounded hover:bg-bs-cream/90 transition-colors"
          >
            TORNA ALLA HOME
          </Link>
        </div>
        <p className="font-body text-[10px] text-bs-cream/20 tracking-[0.1em] uppercase pt-8">
          BLACK SHEEP
        </p>
      </div>
    </main>
  );
}
