"use client";

import { useId, useState } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";
import type { Gender } from "@/lib/validations";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "female", label: "Donna" },
  { value: "male", label: "Uomo" },
];

interface NoSubscriberDialogProps {
  open: boolean;
  email: string;
  onClose: () => void;
  onSubmit: (email: string, name: string | undefined, gender: Gender) => void;
  submitted?: boolean;
  isSubmitting?: boolean;
}

export function NoSubscriberDialog({
  open,
  email,
  onClose,
  onSubmit,
  submitted = false,
  isSubmitting = false,
}: NoSubscriberDialogProps) {
  const titleId = useId();
  const descId = useId();
  const genderErrorId = useId();
  const consentErrorId = useId();

  const [name, setName] = useState("");
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [touched, setTouched] = useState(false);

  function handleSubmit() {
    setTouched(true);
    if (!selectedGender || !consent) return;
    onSubmit(email, name.trim() || undefined, selectedGender);
  }

  const showGenderError = touched && !selectedGender;
  const showConsentError = touched && !consent;

  if (submitted) {
    return (
      <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
        <DialogHeader id={titleId}>CONTROLLA LA TUA EMAIL</DialogHeader>
        <DialogContent id={descId}>
          <p className="mb-4 text-sm">
            Ti abbiamo inviato un&apos;email di conferma. Clicca sul link per completare
            l&apos;iscrizione e entrare automaticamente in lista.
          </p>
          <p className="text-xs text-bs-cream/60">Non la trovi? Controlla la cartella spam.</p>
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity"
          >
            HO CAPITO
          </button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>ISCRIVITI E ENTRA IN LISTA</DialogHeader>
      <DialogContent id={descId}>
        <p className="mb-4 text-sm">
          Per accedere alla lista devi prima iscriverti alla newsletter. Compila qui sotto — è
          veloce.
        </p>

        <div className="flex flex-col gap-4">
          {/* Honeypot */}
          <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="ns-website">Website</label>
            <input
              id="ns-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Email — read-only display */}
          <div>
            <span className="block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2">
              Email
            </span>
            <p className="font-body text-sm text-bs-cream py-2">{email}</p>
          </div>

          {/* Nome — optional */}
          <div>
            <label
              htmlFor="ns-name"
              className="block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2"
            >
              Nome <span className="text-bs-cream/30">(opzionale)</span>
            </label>
            <input
              id="ns-name"
              type="text"
              autoComplete="given-name"
              placeholder="Il tuo nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b border-bs-cream/15 px-0 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/25 focus:outline-none focus:border-bs-cream/40 transition-colors"
            />
          </div>

          {/* Gender — required */}
          <fieldset aria-describedby={showGenderError ? genderErrorId : undefined}>
            <legend className="font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2">
              Genere <span aria-hidden="true">*</span>
            </legend>
            <div className="flex flex-col gap-1.5">
              {genderOptions.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="ns-gender"
                    value={value}
                    checked={selectedGender === value}
                    onChange={() => {
                      setSelectedGender(value);
                      setTouched(false);
                    }}
                    className="accent-bs-cream w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="font-body text-sm text-bs-cream/70 group-hover:text-bs-cream transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            {showGenderError && (
              <p
                id={genderErrorId}
                role="alert"
                className="font-body text-xs text-bs-burgundy mt-2"
              >
                Seleziona un&apos;opzione per continuare
              </p>
            )}
          </fieldset>

          {/* Privacy consent */}
          <div>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (e.target.checked) setTouched(false);
                }}
                className="accent-bs-cream w-3.5 h-3.5 cursor-pointer mt-0.5"
                aria-describedby={showConsentError ? consentErrorId : undefined}
              />
              <span className="font-body text-xs text-bs-cream/70 group-hover:text-bs-cream transition-colors">
                Accetto la{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-bs-cream"
                >
                  privacy policy
                </a>
              </span>
            </label>
            {showConsentError && (
              <p
                id={consentErrorId}
                role="alert"
                className="font-body text-xs text-bs-burgundy mt-2 ml-6"
              >
                Devi accettare la privacy policy per continuare
              </p>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-5 py-3 border border-bs-cream/20 text-bs-cream/60 font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:border-bs-cream/40 hover:text-bs-cream/80 transition-all"
        >
          ANNULLA
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "INVIO IN CORSO..." : "ISCRIVITI E ENTRA IN LISTA"}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
