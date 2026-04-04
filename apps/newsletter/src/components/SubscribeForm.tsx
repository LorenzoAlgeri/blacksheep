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
      className="flex flex-col gap-3 w-full animate-slide-up"
      style={{ animationDelay: "400ms" }}
      noValidate
    >
      {/* Honeypot — hidden from humans, visible to bots */}
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

      <div>
        <label htmlFor="email" className="sr-only">Email</label>
        <input
          id="email"
          type="email"
          placeholder="La tua email"
          autoComplete="email"
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/30 transition-all duration-300"
          {...register("email")}
        />
        {errors.email && (
          <p className="font-body text-xs text-bs-burgundy mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="sr-only">Nome (opzionale)</label>
        <input
          id="name"
          type="text"
          placeholder="Nome (opzionale)"
          autoComplete="given-name"
          className="w-full bg-transparent border border-bs-cream/10 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/20 transition-all duration-300"
          {...register("name")}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-bs-gold text-bs-black font-heading text-xl tracking-widest py-3.5 rounded-md transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed animate-glow-breathe cursor-pointer"
      >
        {isSubmitting ? "..." : "ENTRA NELLA LISTA"}
      </button>

      {serverError && (
        <p className="font-body text-xs text-bs-burgundy text-center">{serverError}</p>
      )}
    </form>
  );
}
