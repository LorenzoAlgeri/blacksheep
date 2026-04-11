"use client";

import { useState, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, STAGGER, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { MagneticButton } from "@/components/ui/MagneticButton";

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

/* ─── Countdown box with tick animation ──────────────────────────── */

function CountdownBox({
  value,
  label,
  accent = false,
  animate = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
  animate?: boolean;
}) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (!animate || !valueRef.current || prevValue.current === value) {
      prevValue.current = value;
      return;
    }
    prevValue.current = value;

    // Tick animation: new number drops in from above
    const el = valueRef.current;
    gsap.fromTo(el, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
  }, [value, animate]);

  return (
    <div
      className={`flex flex-col items-center justify-center bg-bs-cream/5 px-3 py-2.5 sm:px-6 sm:py-4 min-w-0 ${
        accent ? "border border-bs-cream/20" : "border border-bs-cream/10"
      }`}
    >
      <span ref={valueRef} className="font-brand text-xl sm:text-2xl tabular-nums text-bs-cream">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-bs-cream/60">{label}</span>
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

  /* GSAP entrance — split entry: title from left, countdown from right, lineup from bottom */
  useGSAP(
    () => {
      if (prefersReduced || !containerRef.current) return;

      const trigger = {
        trigger: containerRef.current,
        ...SCROLL_TRIGGER_DEFAULTS,
      };

      // Title/date block — from left
      const titleBlock = containerRef.current.querySelectorAll("[data-animate='title']");
      if (titleBlock.length > 0) {
        gsap.from(titleBlock, {
          ...ENTRANCE.fromLeft,
          duration: DURATION.major,
          ease: EASE.enter,
          stagger: STAGGER.wide,
          scrollTrigger: trigger,
        });
      }

      // Countdown block — from right
      const countdownBlock = containerRef.current.querySelector("[data-animate='countdown']");
      if (countdownBlock) {
        gsap.from(countdownBlock, {
          ...ENTRANCE.fromRight,
          duration: DURATION.major,
          ease: EASE.enter,
          delay: 0.15,
          scrollTrigger: trigger,
        });
      }

      // Lineup + CTA — from bottom (standard)
      const bottomBlock = containerRef.current.querySelectorAll("[data-animate='bottom']");
      if (bottomBlock.length > 0) {
        gsap.from(bottomBlock, {
          ...ENTRANCE.card,
          duration: DURATION.major,
          ease: EASE.enter,
          stagger: STAGGER.wide,
          delay: 0.3,
          scrollTrigger: trigger,
        });
      }
    },
    { dependencies: [prefersReduced] },
  );

  /* Expired state */
  const isExpired = timeLeft === null;

  return (
    <section id="next-event" className="bg-gradient-to-b from-black to-[#0a0a0a] section-padding">
      <div ref={containerRef} className="mx-auto max-w-2xl text-center">
        {/* Heading + divider */}
        <SectionHeading>PROSSIMO EVENTO</SectionHeading>
        <GoldDivider className="my-8" />

        {/* Date — enters from left */}
        <p
          data-animate="title"
          data-motion
          className="font-brand text-lg tracking-wide text-bs-cream sm:text-2xl md:text-3xl"
        >
          LUNEDI 14 APRILE 2026
        </p>

        {/* Countdown or expired message — enters from right */}
        {isExpired ? (
          <p
            data-animate="countdown"
            data-motion
            className="mt-8 font-brand text-xl uppercase tracking-widest text-bs-cream"
          >
            EVENTO IN CORSO
          </p>
        ) : (
          <div
            data-animate="countdown"
            data-motion
            aria-live="polite"
            aria-label="Conto alla rovescia"
            className="mt-8 flex justify-center gap-2 sm:gap-4"
          >
            <CountdownBox value={timeLeft.days} label="Giorni" />
            <CountdownBox value={timeLeft.hours} label="Ore" />
            <CountdownBox value={timeLeft.minutes} label="Min" />
            <CountdownBox value={timeLeft.seconds} label="Sec" accent animate={!prefersReduced} />
          </div>
        )}

        {/* DJ Lineup — enters from bottom */}
        <div data-animate="bottom" data-motion className="mt-10 space-y-2">
          {DJ_LINEUP.map((dj) => (
            <div key={dj.name} className="flex items-center justify-center gap-2">
              <span className="font-brand text-sm uppercase text-bs-cream">{dj.name}</span>
              <span className="text-xs text-bs-cream/50">— {dj.role}</span>
            </div>
          ))}
        </div>

        {/* CTA — enters from bottom */}
        <div data-animate="bottom" data-motion className="mt-10">
          <MagneticButton
            href={WHATSAPP_LINK}
            className="block w-full sm:inline-block sm:w-auto rounded-none bg-bs-cream px-8 py-4 font-brand uppercase tracking-wider text-black text-center min-h-[48px] motion-safe:transition-opacity hover:motion-safe:opacity-90"
          >
            PRENOTA TAVOLO
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
