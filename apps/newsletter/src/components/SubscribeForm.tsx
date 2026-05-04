"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GENDER_VALUES, type Gender } from "@/lib/validations";
import { basePath } from "@/lib/base-path";
import { SuccessMessage } from "./SuccessMessage";
import { validateEmail, type EmailValidation } from "@/lib/email-validation";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "female", label: "Donna" },
  { value: "male", label: "Uomo" },
];

// Extend subscribeSchema locally with emailConfirmation for client-side UX
const subscribeFormSchema = z
  .object({
    email: z.email("Inserisci un'email valida"),
    emailConfirmation: z.email("Inserisci un'email valida"),
    gender: z.enum(GENDER_VALUES, { error: "Seleziona un'opzione" }),
    name: z.string().max(100).optional(),
    website: z.string().optional(),
  })
  .refine((d) => d.email.toLowerCase() === d.emailConfirmation.toLowerCase(), {
    message: "Le due email non coincidono",
    path: ["emailConfirmation"],
  });

type SubscribeFormData = z.infer<typeof subscribeFormSchema>;

type Suggestion = Extract<EmailValidation, { kind: "suggestion" }>;
type DisposableResult = Extract<EmailValidation, { kind: "disposable" }>;

export function SubscribeForm() {
  const emailErrorId = useId();
  const confirmErrorId = useId();
  const genderErrorId = useId();

  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<Suggestion | null>(null);
  const [confirmSuggestion, setConfirmSuggestion] = useState<Suggestion | null>(null);
  const [emailDisposable, setEmailDisposable] = useState<DisposableResult | null>(null);
  const [confirmDisposable, setConfirmDisposable] = useState<DisposableResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubscribeFormData>({
    resolver: zodResolver(subscribeFormSchema),
    mode: "onBlur",
  });

  async function onSubmit(data: SubscribeFormData) {
    // Hard block: disposable email detected on either field
    if (emailDisposable || confirmDisposable) return;

    setServerError(null);
    try {
      const res = await fetch(`${basePath}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          gender: data.gender,
          name: data.name,
          website: data.website,
        }),
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

  function handleEmailBlur(value: string) {
    const result = validateEmail(value);
    setEmailSuggestion(result.kind === "suggestion" ? result : null);
    setEmailDisposable(result.kind === "disposable" ? result : null);
  }

  function handleConfirmBlur(value: string) {
    const result = validateEmail(value);
    setConfirmSuggestion(result.kind === "suggestion" ? result : null);
    setConfirmDisposable(result.kind === "disposable" ? result : null);
  }

  if (submitted) {
    return <SuccessMessage />;
  }

  const emailReg = register("email");
  const confirmReg = register("emailConfirmation");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 w-full" noValidate>
      {/* Honeypot */}
      <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      {/* Email field */}
      <div data-motion="input">
        <label
          htmlFor="email"
          className="block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-1 sr-only"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="La tua email"
          autoComplete="email"
          aria-invalid={!!errors.email || !!emailDisposable}
          aria-describedby={errors.email || emailDisposable ? emailErrorId : undefined}
          className="w-full bg-transparent border-0 border-b border-bs-cream/10 rounded-none px-2 input-responsive input-field font-body text-sm text-bs-cream placeholder:text-bs-cream/30 focus:outline-none focus:border-b-bs-cream/30 focus:ring-0 transition-all duration-200"
          {...emailReg}
          onBlur={(e) => {
            emailReg.onBlur(e);
            handleEmailBlur(e.target.value);
          }}
        />
        {emailDisposable && (
          <p id={emailErrorId} role="alert" className="font-body text-xs text-bs-burgundy mt-1">
            Per cortesia usa un&apos;email personale (Gmail, Outlook, ecc.)
          </p>
        )}
        {errors.email && !emailDisposable && (
          <p id={emailErrorId} role="alert" className="font-body text-xs text-bs-burgundy mt-1">
            {errors.email.message}
          </p>
        )}
        {emailSuggestion && !errors.email && !emailDisposable && (
          <div role="status" aria-live="polite" className="mt-2 font-body text-xs text-amber-300">
            Forse intendevi <strong>{emailSuggestion.suggested}</strong>?{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setValue("email", emailSuggestion.suggested, { shouldValidate: true });
                setEmailSuggestion(null);
              }}
            >
              Correggi
            </button>
          </div>
        )}
      </div>

      {/* Confirm email field */}
      <div data-motion="input">
        <label
          htmlFor="email-confirmation"
          className="block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-1 sr-only"
        >
          Conferma email
        </label>
        <input
          id="email-confirmation"
          type="email"
          placeholder="Ripeti la tua email"
          autoComplete="email"
          aria-invalid={!!errors.emailConfirmation || !!confirmDisposable}
          aria-describedby={
            errors.emailConfirmation || confirmDisposable ? confirmErrorId : undefined
          }
          className="w-full bg-transparent border-0 border-b border-bs-cream/10 rounded-none px-2 input-responsive input-field font-body text-sm text-bs-cream placeholder:text-bs-cream/30 focus:outline-none focus:border-b-bs-cream/30 focus:ring-0 transition-all duration-200"
          {...confirmReg}
          onBlur={(e) => {
            confirmReg.onBlur(e);
            handleConfirmBlur(e.target.value);
          }}
        />
        {confirmDisposable && (
          <p id={confirmErrorId} role="alert" className="font-body text-xs text-bs-burgundy mt-1">
            Per cortesia usa un&apos;email personale (Gmail, Outlook, ecc.)
          </p>
        )}
        {errors.emailConfirmation && !confirmDisposable && (
          <p id={confirmErrorId} role="alert" className="font-body text-xs text-bs-burgundy mt-1">
            {errors.emailConfirmation.message}
          </p>
        )}
        {confirmSuggestion && !errors.emailConfirmation && !confirmDisposable && (
          <div role="status" aria-live="polite" className="mt-2 font-body text-xs text-amber-300">
            Forse intendevi <strong>{confirmSuggestion.suggested}</strong>?{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setValue("emailConfirmation", confirmSuggestion.suggested, {
                  shouldValidate: true,
                });
                setConfirmSuggestion(null);
              }}
            >
              Correggi
            </button>
          </div>
        )}
      </div>

      {/* Gender segmented control */}
      <fieldset data-motion="input" aria-describedby={errors.gender ? genderErrorId : undefined}>
        <legend className="block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/30 mb-2">
          Genere
        </legend>
        <div className="grid grid-cols-2 gap-1">
          {genderOptions.map(({ value, label }) => (
            <label key={value} className="relative cursor-pointer">
              <input type="radio" value={value} className="sr-only peer" {...register("gender")} />
              <span className="flex items-center justify-center px-2 py-1.5 border border-bs-cream/15 rounded-sm font-[family-name:var(--font-brand)] text-[9px] uppercase tracking-[0.18em] text-bs-cream/40 transition-all duration-150 peer-checked:border-bs-cream/50 peer-checked:text-bs-cream peer-checked:bg-bs-cream/5 hover:border-bs-cream/25 hover:text-bs-cream/60">
                {label}
              </span>
            </label>
          ))}
        </div>
        {errors.gender && (
          <p id={genderErrorId} role="alert" className="font-body text-xs text-bs-burgundy mt-1">
            {errors.gender.message}
          </p>
        )}
      </fieldset>

      <div data-motion="input">
        <label htmlFor="name" className="sr-only">
          Nome
        </label>
        <input
          id="name"
          type="text"
          placeholder="Nome"
          autoComplete="given-name"
          className="w-full bg-transparent border-0 border-b border-bs-cream/10 rounded-none px-2 input-responsive input-field font-body text-sm text-bs-cream placeholder:text-bs-cream/30 focus:outline-none focus:border-b-bs-cream/30 focus:ring-0 transition-all duration-200"
          {...register("name")}
        />
      </div>

      <button
        data-motion="cta"
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-bs-cream text-black font-[family-name:var(--font-brand)] text-lg tracking-[0.15em] cta-responsive cta-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cta-btn cursor-pointer mt-1"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            ISCRIZIONE IN CORSO...
          </span>
        ) : (
          "ISCRIVITI"
        )}
      </button>

      {serverError && (
        <p role="alert" className="font-body text-xs text-bs-burgundy text-center mt-1">
          {serverError}
        </p>
      )}

      <p data-motion="consent" className="font-body text-[10px] text-bs-cream/20 text-center mt-2">
        Iscrivendoti accetti la nostra{" "}
        <a
          href="/newsletter/privacy"
          className="underline hover:text-bs-cream/40 transition-colors"
        >
          Privacy Policy
        </a>
      </p>
    </form>
  );
}
