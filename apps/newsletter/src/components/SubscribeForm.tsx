"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subscribeSchema, type SubscribeInput } from "@/lib/validations";
import { SuccessMessage } from "./SuccessMessage";

export function SubscribeForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubscribeInput>({
    resolver: zodResolver(subscribeSchema),
  });

  async function onSubmit(data: SubscribeInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/subscribe", {
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

  if (submitted) {
    return <SuccessMessage />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 w-full"
      noValidate
    >
      {/* Honeypot */}
      <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div data-motion="input">
        <label htmlFor="email" className="sr-only">Email</label>
        <input
          id="email"
          type="email"
          placeholder="La tua email"
          autoComplete="email"
          className="w-full bg-white/[0.02] border border-bs-cream/15 rounded-lg px-5 input-responsive input-field font-body text-sm text-bs-cream placeholder:text-bs-cream/35 transition-all duration-200"
          {...register("email")}
        />
        {errors.email && (
          <p className="font-body text-xs text-bs-burgundy mt-1">{errors.email.message}</p>
        )}
      </div>

      <div data-motion="input">
        <label htmlFor="name" className="sr-only">Nome (opzionale)</label>
        <input
          id="name"
          type="text"
          placeholder="Nome (opzionale)"
          autoComplete="given-name"
          className="w-full bg-white/[0.02] border border-bs-cream/12 rounded-lg px-5 input-responsive input-field font-body text-sm text-bs-cream placeholder:text-bs-cream/30 transition-all duration-200"
          {...register("name")}
        />
      </div>

      <button
        data-motion="cta"
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-bs-cream text-black font-[family-name:var(--font-brand)] text-lg tracking-[0.15em] cta-responsive cta-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cta-btn cursor-pointer mt-1"
      >
        {isSubmitting ? "..." : "THE PLACE TO BE"}
      </button>

      {serverError && (
        <p className="font-body text-xs text-bs-burgundy text-center mt-1">{serverError}</p>
      )}
    </form>
  );
}
