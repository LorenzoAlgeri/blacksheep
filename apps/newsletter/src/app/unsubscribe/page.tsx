import Image from "next/image";

export default function UnsubscribePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Image
        src="/bs-logo.svg"
        alt="BLACK SHEEP"
        width={80}
        height={52}
        className="mb-6 opacity-30"
        style={{ height: "auto", filter: "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)" }}
      />
      <h1 className="font-[family-name:var(--font-brand)] text-3xl tracking-wider text-bs-cream mb-4">
        DISISCRITTO
      </h1>
      <p className="font-body text-bs-cream/50 text-base max-w-xs">
        Non riceverai pi&ugrave; le nostre email. Se cambi idea, puoi sempre
        reiscriverti dalla pagina principale.
      </p>
    </main>
  );
}
