"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z
  .object({
    email: z.email("Inserisci un'email valida"),
    emailConfirmation: z.email("Inserisci un'email valida"),
    website: z.string().optional(),
  })
  .refine((d) => d.email.toLowerCase() === d.emailConfirmation.toLowerCase(), {
    message: "Le email non coincidono",
    path: ["emailConfirmation"],
  });

type FormData = z.infer<typeof formSchema>;

interface EventRegistrationFormProps {
  onSubmit: (email: string, emailConfirmation: string) => void;
  isSubmitting: boolean;
  error: string | null;
}

export function EventRegistrationForm({
  onSubmit,
  isSubmitting,
  error,
}: EventRegistrationFormProps) {
  const emailErrorId = useId();
  const confirmErrorId = useId();
  const serverErrorId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) });

  function onValid(data: FormData) {
    onSubmit(data.email, data.emailConfirmation);
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4" noValidate>
      {/* Honeypot */}
      <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="reg-website">Website</label>
        <input
          id="reg-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div>
        <label
          htmlFor="reg-email"
          className="block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2"
        >
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="La tua email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrorId : undefined}
          className="w-full bg-transparent border-b border-bs-cream/15 px-0 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/25 focus:outline-none focus:border-bs-cream/40 transition-colors"
          {...register("email")}
        />
        {errors.email && (
          <p id={emailErrorId} role="alert" className="mt-1 font-body text-xs text-bs-burgundy">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="reg-email-confirm"
          className="block font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2"
        >
          Conferma email
        </label>
        <input
          id="reg-email-confirm"
          type="email"
          autoComplete="email"
          placeholder="Ripeti la tua email"
          aria-invalid={!!errors.emailConfirmation}
          aria-describedby={errors.emailConfirmation ? confirmErrorId : undefined}
          className="w-full bg-transparent border-b border-bs-cream/15 px-0 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/25 focus:outline-none focus:border-bs-cream/40 transition-colors"
          {...register("emailConfirmation")}
        />
        {errors.emailConfirmation && (
          <p id={confirmErrorId} role="alert" className="mt-1 font-body text-xs text-bs-burgundy">
            {errors.emailConfirmation.message}
          </p>
        )}
      </div>

      {error && (
        <p id={serverErrorId} role="alert" className="font-body text-xs text-bs-burgundy">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {isSubmitting ? "Invio in corso..." : "Entra in lista"}
      </button>
    </form>
  );
}
