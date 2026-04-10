"use client";

import { useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageCircle } from "lucide-react";
import { EASE, DURATION, STAGGER, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";

gsap.registerPlugin(ScrollTrigger);

const INPUT_CLASS =
  "w-full bg-transparent border border-bs-cream/10 px-4 py-3 text-bs-cream font-body text-sm placeholder:text-bs-cream/20 focus:border-bs-cream/30 focus:outline-none transition-colors";

export function Contact() {
  const containerRef = useRef<HTMLFormElement>(null);
  const prefersReduced = useReducedMotion();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [message, setMessage] = useState("");

  useGSAP(
    () => {
      if (prefersReduced || !containerRef.current) return;

      const fields = containerRef.current.querySelectorAll("[data-animate='field']");
      if (fields.length === 0) return;

      gsap.from(fields, {
        ...ENTRANCE.text,
        duration: DURATION.standard,
        ease: EASE.enter,
        stagger: STAGGER.normal,
        scrollTrigger: {
          trigger: containerRef.current,
          ...SCROLL_TRIGGER_DEFAULTS,
        },
      });
    },
    { dependencies: [prefersReduced] },
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const text = `Ciao, vorrei prenotare un tavolo.\n\nNome: ${name}\nData: ${date}\nPersone: ${guests}${message ? `\nNote: ${message}` : ""}`;
    window.open(`https://wa.me/393XXXXXXXXX?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <section id="contact" className="section-padding bg-section-dark">
      <SectionHeading>PRENOTA</SectionHeading>
      <GoldDivider className="my-8" />

      <form ref={containerRef} onSubmit={handleSubmit} className="mx-auto max-w-md">
        <div data-animate="field" data-motion>
          <input
            type="text"
            required
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div data-animate="field" data-motion className="mt-4">
          <input
            type="text"
            required
            placeholder="Data (es. 14 aprile)"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div data-animate="field" data-motion className="mt-4">
          <input
            type="number"
            required
            min={1}
            max={20}
            placeholder="Numero persone"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div data-animate="field" data-motion className="mt-4">
          <textarea
            rows={3}
            placeholder="Note (opzionale)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div data-animate="field" data-motion>
          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center gap-2 bg-bs-burgundy py-4 font-brand text-sm uppercase tracking-widest text-bs-cream transition-all hover:brightness-110"
          >
            <MessageCircle size={16} />
            INVIA SU WHATSAPP
          </button>
        </div>
      </form>
    </section>
  );
}
