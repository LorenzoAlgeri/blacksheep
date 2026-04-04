import { BSLogo } from "@blacksheep/shared/BSLogo";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ already?: string }>;
}) {
  const { already } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <BSLogo className="text-bs-gold mb-6" width={80} height={80} />
      <h1 className="font-heading text-4xl tracking-wider text-bs-gold mb-4">
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
