"use client";

import { useState, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, STAGGER, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";

gsap.registerPlugin(ScrollTrigger);

/* ─── Event config ────────────────────────────────────────────────── */

const TARGET_DATE = new Date("2026-04-14T23:00:00+02:00"); // Monday 14 April 2026, 23:00 CEST

const DJ_LINEUP = [
  { name: "DJ NOOR", role: "Main Set" },
  { name: "EMME", role: "Opening" },
  { name: "KAIROS", role: "Closing" },
] as const;

const WHATSAPP_LINK =
  "https://wa.me/393XXXXXXXXX?text=Ciao%2C%20vorrei%20prenotare%20un%20tavolo%20per%20il%2014%20aprile";

/* ─── Helpers ─────────────────────────────────────────────────────── */

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/* ─── Countdown box ───────────────────────────────────────────────── */

function CountdownBox({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-bs-cream/5 px-4 py-3 sm:px-6 sm:py-4 ${
        accent ? "border border-bs-burgundy/40" : "border border-bs-cream/10"
      }`}
    >
      <span className="font-brand text-2xl tabular-nums text-bs-cream">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-bs-cream/40">{label}</span>
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────────── */

export function NextEvent() {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  /* Countdown state */
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(TARGET_DATE));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(TARGET_DATE));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* GSAP entrance */
  useGSAP(
    () => {
      if (prefersReduced || !containerRef.current) return;

      const texts = containerRef.current.querySelectorAll("[data-animate='text']");
      const cards = containerRef.current.querySelectorAll("[data-animate='card']");

      if (texts.length > 0) {
        gsap.from(texts, {
          ...ENTRANCE.text,
          duration: DURATION.standard,
          ease: EASE.enter,
          stagger: STAGGER.normal,
          scrollTrigger: {
            trigger: containerRef.current,
            ...SCROLL_TRIGGER_DEFAULTS,
          },
        });
      }

      if (cards.length > 0) {
        gsap.from(cards, {
          ...ENTRANCE.card,
          duration: DURATION.standard,
          ease: EASE.enter,
          stagger: STAGGER.tight,
          scrollTrigger: {
            trigger: containerRef.current,
            ...SCROLL_TRIGGER_DEFAULTS,
          },
        });
      }
    },
    { dependencies: [prefersReduced] },
  );

  /* Expired state */
  const isExpired = timeLeft === null;

  return (
    <section id="next-event" className="bg-gradient-to-b from-bs-navy to-[#0a0e1a] section-padding">
      <div ref={containerRef} className="mx-auto max-w-2xl text-center">
        {/* Heading + divider */}
        <SectionHeading>PROSSIMO EVENTO</SectionHeading>
        <GoldDivider className="my-8" />

        {/* Date */}
        <p
          data-animate="text"
          data-motion
          className="font-brand text-lg tracking-wide text-bs-cream sm:text-2xl md:text-3xl"
        >
          LUNEDI 14 APRILE 2026
        </p>

        {/* Countdown or expired message */}
        {isExpired ? (
          <p
            data-animate="text"
            data-motion
            className="mt-8 font-brand text-xl uppercase tracking-widest text-bs-gold"
          >
            EVENTO IN CORSO
          </p>
        ) : (
          <div className="mt-8 flex justify-center gap-2 sm:gap-4">
            <CountdownBox value={timeLeft.days} label="Giorni" />
            <CountdownBox value={timeLeft.hours} label="Ore" />
            <CountdownBox value={timeLeft.minutes} label="Min" />
            <CountdownBox value={timeLeft.seconds} label="Sec" accent />
          </div>
        )}

        {/* DJ Lineup */}
        <div data-animate="text" data-motion className="mt-10 space-y-2">
          {DJ_LINEUP.map((dj) => (
            <div key={dj.name} className="flex items-center justify-center gap-2">
              <span className="font-brand text-sm uppercase text-bs-cream">{dj.name}</span>
              <span className="text-xs text-bs-cream/50">— {dj.role}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div data-animate="card" data-motion className="mt-10">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-none bg-bs-burgundy px-8 py-4 font-brand uppercase tracking-wider text-bs-cream transition-[filter] hover:brightness-110"
          >
            PRENOTA TAVOLO
          </a>
        </div>
      </div>
    </section>
  );
}
