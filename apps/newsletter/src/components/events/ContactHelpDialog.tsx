"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";
import { basePath } from "@/lib/base-path";

const schema = z.object({
  email: z.email("Inserisci un'email valida"),
  phone: z.string().min(5, "Telefono troppo corto").max(30, "Telefono troppo lungo"),
  name: z.string().min(1, "Nome obbligatorio").max(100, "Nome troppo lungo"),
  message: z.string().max(2000, "Messaggio troppo lungo").optional(),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ContactHelpDialogProps {
  open: boolean;
  onClose: () => void;
  email: string;
}

export function ContactHelpDialog({ open, onClose, email }: ContactHelpDialogProps) {
  const titleId = useId();
  const descId = useId();
  const statusId = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email },
  });

  async function onValid(data: FormData) {
    setServerError(null);
    try {
      const res = await fetch(`${basePath}/api/contact-help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Errore. Riprova.");
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Errore di rete. Riprova.");
    }
  }

  const inputClass =
    "w-full bg-transparent border-b border-bs-cream/15 px-0 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/25 focus:outline-none focus:border-bs-cream/40 transition-colors";
  const labelClass =
    "block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2";
  const errorClass = "mt-1 font-body text-xs text-bs-burgundy";

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>SCRIVICI</DialogHeader>
      <DialogContent id={descId}>
        {submitted ? (
          <p id={statusId} role="status" aria-live="polite" className="text-sm text-bs-cream/70">
            Messaggio ricevuto — ti risponderemo presto.
          </p>
        ) : (
          <form
            id="contact-help-form"
            onSubmit={handleSubmit(onValid)}
            className="flex flex-col gap-4"
            noValidate
          >
            {/* Honeypot */}
            <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="ch-website">Website</label>
              <input
                id="ch-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register("website")}
              />
            </div>

            <div>
              <label htmlFor="ch-email" className={labelClass}>
                Email
              </label>
              <input
                id="ch-email"
                type="email"
                autoComplete="email"
                className={inputClass}
                {...register("email")}
              />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="ch-phone" className={labelClass}>
                Telefono
              </label>
              <input
                id="ch-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+39 333 1234567"
                className={inputClass}
                {...register("phone")}
              />
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            </div>

            <div>
              <label htmlFor="ch-name" className={labelClass}>
                Nome
              </label>
              <input
                id="ch-name"
                type="text"
                autoComplete="given-name"
                placeholder="Il tuo nome"
                className={inputClass}
                {...register("name")}
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="ch-message" className={labelClass}>
                Messaggio (opzionale)
              </label>
              <textarea
                id="ch-message"
                rows={3}
                placeholder="Descrivici il problema..."
                className={`${inputClass} resize-none`}
                {...register("message")}
              />
              {errors.message && <p className={errorClass}>{errors.message.message}</p>}
            </div>

            {serverError && (
              <p role="alert" className={errorClass}>
                {serverError}
              </p>
            )}
          </form>
        )}
      </DialogContent>
      {!submitted && (
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-3 font-body text-xs uppercase tracking-[0.15em] text-bs-cream/55 underline underline-offset-4 hover:text-bs-cream transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            form="contact-help-form"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Invio..." : "Invia"}
          </button>
        </DialogFooter>
      )}
      {submitted && (
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity"
          >
            Chiudi
          </button>
        </DialogFooter>
      )}
    </Dialog>
  );
}
