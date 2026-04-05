import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — BLACK SHEEP",
  description:
    "Informativa sulla privacy di BLACK SHEEP. Come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali.",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <Image
        src="/bs-logo.svg"
        alt="BLACK SHEEP"
        width={60}
        height={39}
        className="mb-8 opacity-20"
        style={{
          height: "auto",
          filter:
            "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)",
        }}
      />

      <article className="max-w-lg w-full space-y-6">
        <h1 className="font-[family-name:var(--font-brand)] text-2xl tracking-wider text-bs-cream text-center mb-8">
          PRIVACY POLICY
        </h1>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            Titolare del trattamento
          </h2>
          <p className="font-body text-sm text-bs-cream/50 leading-relaxed">
            BLACK SHEEP &mdash; Per qualsiasi richiesta relativa alla privacy, contattaci
            all&apos;indirizzo:{" "}
            <a href="mailto:privacy@blacksheep.community" className="text-bs-cream/70 underline">
              privacy@blacksheep.community
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            Dati raccolti
          </h2>
          <p className="font-body text-sm text-bs-cream/50 leading-relaxed">
            Quando ti iscrivi alla newsletter, raccogliamo:
          </p>
          <ul className="font-body text-sm text-bs-cream/50 leading-relaxed list-disc list-inside space-y-1">
            <li>Indirizzo email (obbligatorio)</li>
            <li>Nome (opzionale)</li>
            <li>
              Indirizzo IP e User-Agent del browser (per finalit&agrave; di audit del consenso)
            </li>
            <li>Data e ora dell&apos;iscrizione</li>
            <li>Versione della privacy policy accettata</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            Finalit&agrave; del trattamento
          </h2>
          <ul className="font-body text-sm text-bs-cream/50 leading-relaxed list-disc list-inside space-y-1">
            <li>Invio della newsletter settimanale con lineup, date e aggiornamenti</li>
            <li>Gestione delle iscrizioni e disiscrizioni</li>
            <li>Adempimento di obblighi legali (audit trail del consenso GDPR)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            Base giuridica
          </h2>
          <p className="font-body text-sm text-bs-cream/50 leading-relaxed">
            Il trattamento dei dati si basa sul tuo consenso esplicito (Art. 6, par. 1, lett. a,
            GDPR), fornito al momento dell&apos;iscrizione alla newsletter tramite il nostro form
            con double opt-in.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            I tuoi diritti
          </h2>
          <p className="font-body text-sm text-bs-cream/50 leading-relaxed">
            Ai sensi del GDPR, hai il diritto di:
          </p>
          <ul className="font-body text-sm text-bs-cream/50 leading-relaxed list-disc list-inside space-y-1">
            <li>
              <strong className="text-bs-cream/70">Accesso</strong> &mdash; richiedere una copia dei
              tuoi dati personali (Art. 15)
            </li>
            <li>
              <strong className="text-bs-cream/70">Rettifica</strong> &mdash; correggere dati
              inesatti o incompleti (Art. 16)
            </li>
            <li>
              <strong className="text-bs-cream/70">Cancellazione</strong> &mdash; richiedere la
              cancellazione completa dei tuoi dati (Art. 17)
            </li>
            <li>
              <strong className="text-bs-cream/70">Revoca del consenso</strong> &mdash;
              disiscriverti in qualsiasi momento tramite il link in ogni email
            </li>
            <li>
              <strong className="text-bs-cream/70">Portabilit&agrave;</strong> &mdash; ricevere i
              tuoi dati in formato leggibile (Art. 20)
            </li>
            <li>
              <strong className="text-bs-cream/70">Reclamo</strong> &mdash; presentare un reclamo
              all&apos;Autorit&agrave; Garante per la Protezione dei Dati Personali
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            Conservazione dei dati
          </h2>
          <p className="font-body text-sm text-bs-cream/50 leading-relaxed">
            I tuoi dati vengono conservati fino alla disiscrizione. Puoi richiedere la cancellazione
            completa tramite il link &quot;Cancella tutti i miei dati&quot; nella pagina di
            disiscrizione.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            Servizi di terze parti
          </h2>
          <ul className="font-body text-sm text-bs-cream/50 leading-relaxed list-disc list-inside space-y-1">
            <li>
              <strong className="text-bs-cream/70">Supabase</strong> &mdash; database e gestione
              dati (server UE)
            </li>
            <li>
              <strong className="text-bs-cream/70">Resend</strong> &mdash; invio email transazionali
              e newsletter
            </li>
            <li>
              <strong className="text-bs-cream/70">Vercel</strong> &mdash; hosting
              dell&apos;applicazione web
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] text-bs-cream/80 uppercase">
            Contatti
          </h2>
          <p className="font-body text-sm text-bs-cream/50 leading-relaxed">
            Per esercitare i tuoi diritti o per qualsiasi domanda sulla privacy, scrivi a:{" "}
            <a href="mailto:privacy@blacksheep.community" className="text-bs-cream/70 underline">
              privacy@blacksheep.community
            </a>
          </p>
        </section>

        <p className="font-body text-xs text-bs-cream/20 text-center pt-8 border-t border-bs-cream/10">
          Ultimo aggiornamento: Aprile 2026
        </p>
      </article>
    </main>
  );
}
