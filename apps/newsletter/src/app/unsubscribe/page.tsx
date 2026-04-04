import { BSLogo } from "@blacksheep/shared/BSLogo";

export default function UnsubscribePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <BSLogo className="text-bs-cream/30 mb-6" width={80} height={80} />
      <h1 className="font-heading text-3xl tracking-wider text-bs-cream mb-4">
        DISISCRITTO
      </h1>
      <p className="font-body text-bs-cream/50 text-base max-w-xs">
        Non riceverai pi&ugrave; le nostre email. Se cambi idea, puoi sempre
        reiscriverti dalla pagina principale.
      </p>
    </main>
  );
}
