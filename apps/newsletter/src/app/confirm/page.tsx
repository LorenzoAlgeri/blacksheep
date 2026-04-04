import Image from "next/image";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ already?: string }>;
}) {
  const { already } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Image
        src="/bs-logo.svg"
        alt="BLACK SHEEP"
        width={80}
        height={52}
        className="mb-6 opacity-60"
        style={{ filter: "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)" }}
      />
      <h1 className="font-[family-name:var(--font-brand)] text-4xl tracking-wider text-bs-cream mb-4">
        {already ? "GIA' CONFERMATO" : "CI SEI"}
      </h1>
      <p className="font-body text-bs-cream/70 text-lg max-w-xs">
        {already
          ? "La tua email e' gia' confermata. Ci vediamo lunedi'."
          : "Iscrizione confermata. Riceverai lineup e date prima di tutti."}
      </p>
    </main>
  );
}
