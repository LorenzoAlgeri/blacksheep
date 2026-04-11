"use client";

import { useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageCircle } from "lucide-react";
import { EASE, DURATION, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { MagneticButton } from "@/components/ui/MagneticButton";

gsap.registerPlugin(ScrollTrigger);

const INPUT_CLASS =
  "w-full bg-transparent border border-bs-cream/10 px-4 py-3 text-bs-cream font-body text-base md:text-sm min-h-[48px] placeholder:text-bs-cream/20 focus:border-bs-cream/30 focus:outline-none motion-safe:transition-colors";

export function Contact() {
  const containerRef = useRef<HTMLFormElement>(null);
  const prefersReduced = useReducedMotion();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  useGSAP(
    () => {
      if (prefersReduced || !containerRef.current) return;

      // Field cascade with blur "focus" effect
      const fields = containerRef.current.querySelectorAll("[data-animate='field']");
      if (fields.length > 0) {
        gsap.from(fields, {
          ...ENTRANCE.blurUp,
          duration: DURATION.standard,
          ease: EASE.enter,
          stagger: 0.08,
          scrollTrigger: {
            trigger: containerRef.current,
            ...SCROLL_TRIGGER_DEFAULTS,
          },
        });
      }

      // Submit button — scale entrance with a single glow pulse
      const submitBtn = containerRef.current.querySelector("[data-animate='submit']");
      if (submitBtn) {
        gsap.from(submitBtn, {
          scale: 0.95,
          opacity: 0,
          duration: DURATION.standard,
          ease: EASE.enter,
          delay: fields.length * 0.08 + 0.1,
          scrollTrigger: {
            trigger: containerRef.current,
            ...SCROLL_TRIGGER_DEFAULTS,
          },
          onComplete: () => {
            // Single glow pulse on the button
            gsap.fromTo(
              submitBtn,
              { boxShadow: "0 0 0px rgba(255,255,243,0)" },
              {
                boxShadow: "0 0 20px rgba(255,255,243,0.15)",
                duration: 0.6,
                ease: EASE.move,
                yoyo: true,
                repeat: 1,
              },
            );
          },
        });
      }
    },
    { dependencies: [prefersReduced] },
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date,
          guests: Number(guests),
          message,
          website: honeypot,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        return;
      }

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="section-padding bg-section-dark">
      <SectionHeading>PRENOTA</SectionHeading>
      <GoldDivider className="my-8" />

      <form ref={containerRef} onSubmit={handleSubmit} className="mx-auto max-w-md">
        <div data-animate="field" data-motion>
          <label htmlFor="contact-name" className="sr-only">
            Nome
          </label>
          <input
            id="contact-name"
            type="text"
            required
            aria-required="true"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div data-animate="field" data-motion className="mt-4">
          <label htmlFor="contact-date" className="sr-only">
            Data
          </label>
          <input
            id="contact-date"
            type="text"
            required
            aria-required="true"
            placeholder="Data (es. 14 aprile)"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div data-animate="field" data-motion className="mt-4">
          <label htmlFor="contact-guests" className="sr-only">
            Numero persone
          </label>
          <input
            id="contact-guests"
            type="number"
            required
            aria-required="true"
            min={1}
            max={20}
            placeholder="Numero persone"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div data-animate="field" data-motion className="mt-4">
          <label htmlFor="contact-message" className="sr-only">
            Note
          </label>
          <textarea
            id="contact-message"
            rows={3}
            placeholder="Note (opzionale)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* Honeypot — hidden from humans, bots fill it */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {status === "error" && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            Errore nell&apos;invio. Riprova tra qualche secondo.
          </p>
        )}

        <div data-animate="submit" data-motion className="mt-4">
          <MagneticButton
            type="submit"
            fullWidth
            className="flex w-full items-center justify-center gap-2 bg-bs-cream py-4 font-brand text-sm uppercase tracking-widest text-black min-h-[48px] motion-safe:transition-opacity hover:motion-safe:opacity-90"
          >
            <MessageCircle size={16} />
            INVIA SU WHATSAPP
          </MagneticButton>
        </div>
      </form>
    </section>
  );
}
