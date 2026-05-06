import Image from "next/image";

interface StatusContent {
  title: string;
  subtitle: string;
}

const STATUS_CONTENT: Record<string, StatusContent> = {
  ok: {
    title: "CI SEI",
    subtitle: "Sei in lista. Ti aspettiamo alla data — riceverai un promemoria via email.",
  },
  already: {
    title: "GIÀ DENTRO",
    subtitle: "Eri già in lista per questa data. Tranquillo, sei iscritto.",
  },
  invalid: {
    title: "LINK NON VALIDO",
    subtitle: "Questo link non è più attivo. Iscriviti dalla pagina evento per partecipare.",
  },
  event_unavailable: {
    title: "EVENTO NON DISPONIBILE",
    subtitle:
      "L'evento è stato spostato o non è più aperto a registrazioni. Controlla la lista eventi attivi.",
  },
};

const FALLBACK: StatusContent = {
  title: "QUALCOSA È ANDATO STORTO",
  subtitle: "Riprova dalla pagina evento o scrivici se il problema persiste.",
};

export default async function EventRegisteredPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const matched = status ? STATUS_CONTENT[status] : undefined;
  const content: StatusContent = matched ?? FALLBACK;
  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "/";

  return (
    <main className="relative z-10 flex min-h-dvh flex-1 flex-col items-center justify-center px-6 text-center">
      <div>
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

      <h1
        className="font-[family-name:var(--font-brand)] text-4xl tracking-wider text-bs-cream mt-8 confirm-title-glow [text-wrap:balance]"
        translate="no"
      >
        {content.title}
      </h1>

      <div className="w-full max-w-[200px] mt-6 mb-6">
        <div className="h-px bg-gradient-to-r from-transparent via-bs-cream/15 to-transparent" />
      </div>

      <p className="font-body text-sm text-bs-cream/60 max-w-xs leading-relaxed [text-wrap:pretty]">
        {content.subtitle}
      </p>

      <a
        href={mainSiteUrl}
        className="rounded-sm font-body text-[10px] text-bs-cream/20 uppercase tracking-[0.2em] mt-10 hover:text-bs-cream/50 focus-visible:text-bs-cream/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bs-cream/20 transition-colors duration-300"
      >
        Torna al sito
      </a>
    </main>
  );
}
