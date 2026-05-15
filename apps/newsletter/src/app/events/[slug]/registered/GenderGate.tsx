"use client";

import { useState } from "react";
import type { Gender } from "@/lib/validations";
import { basePath } from "@/lib/base-path";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "female", label: "Donna" },
  { value: "male", label: "Uomo" },
];

interface GenderGateProps {
  token: string;
  eventSlug: string;
}

export function GenderGate({ token, eventSlug }: GenderGateProps) {
  const [selected, setSelected] = useState<Gender | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"ok" | "already" | "error" | null>(null);

  const showError = touched && !selected;

  async function handleSubmit() {
    setTouched(true);
    if (!selected) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${basePath}/api/events/register-from-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, event_slug: eventSlug, gender: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.status === "already" ? "already" : "ok");
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result === "ok") {
    return (
      <div className="text-center">
        <p className="font-[family-name:var(--font-brand)] text-2xl tracking-wider text-bs-cream mb-2">
          CI SEI
        </p>
        <p className="font-body text-sm text-bs-cream/60">Sei in lista. Ti aspettiamo alla data.</p>
      </div>
    );
  }

  if (result === "already") {
    return (
      <div className="text-center">
        <p className="font-[family-name:var(--font-brand)] text-2xl tracking-wider text-bs-cream mb-2">
          GIÀ DENTRO
        </p>
        <p className="font-body text-sm text-bs-cream/60">Eri già in lista per questa data.</p>
      </div>
    );
  }

  if (result === "error") {
    return (
      <p className="font-body text-sm text-bs-burgundy">
        Errore durante la registrazione. Riprova dalla pagina evento.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <fieldset>
        <legend className="font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-3 text-center">
          Genere <span aria-hidden="true">*</span>
        </legend>
        <div className="flex gap-4 justify-center">
          {genderOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="gender"
                value={value}
                checked={selected === value}
                onChange={() => {
                  setSelected(value);
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
        {showError && (
          <p role="alert" className="font-body text-xs text-bs-burgundy mt-2 text-center">
            Seleziona un&apos;opzione per continuare
          </p>
        )}
      </fieldset>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="min-h-[44px] px-8 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
      >
        {submitting ? "..." : "ISCRIVIMI"}
      </button>
    </div>
  );
}
