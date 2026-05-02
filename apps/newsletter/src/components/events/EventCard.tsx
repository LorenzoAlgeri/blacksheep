"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatEventDate } from "@/lib/dates";

export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  venue: string;
  description?: string | null;
  capacity?: number | null;
}

interface EventCardProps {
  event: EventCardData;
  onRegisterClick: (event: EventCardData) => void;
  /** Position in the list — drives stagger via CSS custom prop and the
   * editorial counter overline ("01", "02", …). */
  index?: number;
}

const FORMATTERS = {
  day: new Intl.DateTimeFormat("it-IT", { day: "2-digit", timeZone: "Europe/Rome" }),
  month: new Intl.DateTimeFormat("it-IT", { month: "short", timeZone: "Europe/Rome" }),
  weekday: new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: "Europe/Rome" }),
  time: new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }),
};

function dateParts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: FORMATTERS.day.format(date),
    month: FORMATTERS.month.format(date).replace(".", "").toUpperCase(),
    weekday: FORMATTERS.weekday.format(date).replace(".", "").toUpperCase(),
    time: FORMATTERS.time.format(date),
    iso,
  };
}

function counterLabel(index: number) {
  return String(index + 1).padStart(2, "0");
}

function supportsViewTimeline() {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return CSS.supports("animation-timeline: view()");
}

/**
 * EventCard — V1 "Editorial Drama".
 *
 * Design language deliberately diverges from the homepage's GSAP-driven
 * orchestration (LandingMotion / MascotteIntro): native CSS scroll-driven
 * entrance via `animation-timeline: view()` with an IntersectionObserver
 * fallback for browsers below Baseline 2024-newly-available.
 *
 * Composition: 12-column asymmetric grid (5 / 7) anchored by the day
 * number as poster element (clamp 5rem → 11rem). Counter overline
 * ("01 / Lista") pins the editorial register; vertical hairline rule
 * separates date and body on md+; bottom signature scaleX line draws
 * after the CTA settles.
 *
 * Keyframes (in globals.css): bs-rise, bs-num-fill, bs-word-rise,
 * bs-rule-draw, bs-line-draw, bs-cta-pop. All targeted via
 * `[data-bs-*]` selectors; orchestration via animation-timeline
 * scroll ranges (Tier 1) or animation-delay chain on data-animated
 * (Tier 2 fallback).
 */
export function EventCard({ event, onRegisterClick, index = 0 }: EventCardProps) {
  const titleId = useId();
  const parts = dateParts(event.event_date);
  const titleWords = event.title.split(/\s+/).filter(Boolean);
  const articleRef = useRef<HTMLElement>(null);
  // useFallback === true means we need the IO-based animation chain
  // because animation-timeline: view() isn't supported.
  const [useFallback, setUseFallback] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (supportsViewTimeline()) {
      // Native scroll-timeline path: CSS @supports drives animation, JS just
      // flips the data attributes once for downstream selectors / SR signal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUseFallback(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimated(true);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUseFallback(true);
    const node = articleRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimated(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={articleRef}
      aria-labelledby={titleId}
      data-bs-card
      data-fallback={useFallback ? "true" : "false"}
      data-animated={animated ? "true" : "false"}
      style={{ "--card-i": index } as React.CSSProperties}
      className="relative bg-bs-cream/[0.025] border border-bs-cream/[0.08] hover:border-bs-cream/30 transition-colors duration-300 motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        data-bs-accent="top"
        className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-bs-cream/30 to-transparent origin-center scale-x-0 data-[hovered]:scale-x-100 transition-transform duration-700 motion-reduce:transition-none pointer-events-none"
      />

      <div className="grid grid-cols-12 gap-x-4 gap-y-6 p-7 md:p-10 md:gap-x-8">
        {/* Date hero — col-span 12 mobile / 5 md+ */}
        <div className="col-span-12 md:col-span-5 relative">
          <p className="font-[family-name:var(--font-brand)] text-[10px] tracking-[0.5em] text-bs-cream/30 uppercase mb-4">
            <span data-bs-counter>{counterLabel(index)}</span>
            <span className="mx-2 text-bs-cream/15" aria-hidden="true">
              /
            </span>
            <span>Lista</span>
          </p>
          {parts ? (
            <>
              <span
                data-bs-day
                className="block font-[family-name:var(--font-brand)] text-[clamp(5rem,16vw,11rem)] leading-[0.85] tracking-[-0.06em] text-bs-cream"
              >
                {parts.day}
              </span>
              <div className="flex items-baseline gap-3 mt-3 md:mt-4">
                <span className="font-[family-name:var(--font-brand)] text-sm md:text-base tracking-[0.4em] text-bs-cream/65 uppercase">
                  {parts.month}
                </span>
                <span aria-hidden="true" className="text-bs-cream/15">
                  ·
                </span>
                <span className="font-body text-[10px] md:text-xs tracking-[0.25em] text-bs-cream/35 uppercase">
                  {parts.weekday} {parts.time}
                </span>
              </div>
              <span className="sr-only">Data evento: {formatEventDate(event.event_date)}</span>
            </>
          ) : (
            <span className="block font-[family-name:var(--font-brand)] text-3xl text-bs-cream/40 uppercase tracking-[0.15em]">
              data tba
            </span>
          )}
        </div>

        {/* Vertical hairline rule (md+) — sits on the column gap */}
        <span
          aria-hidden="true"
          data-bs-rule
          className="hidden md:block absolute top-10 bottom-10 left-[calc(5/12*100%)] -translate-x-px w-px bg-bs-cream/[0.1] origin-top scale-y-0"
        />

        {/* Body — col-span 12 mobile / 7 md+ */}
        <div className="col-span-12 md:col-span-7 flex flex-col gap-5 min-w-0 md:pl-3">
          <header>
            <h3
              id={titleId}
              className="font-[family-name:var(--font-brand)] text-2xl md:text-[26px] tracking-[0.005em] uppercase text-bs-cream leading-[1.05] [text-wrap:balance]"
            >
              {titleWords.map((word, i) => (
                <span
                  key={`${i}-${word}`}
                  data-bs-word
                  style={{ "--word-i": i } as React.CSSProperties}
                  className="inline-block mr-[0.25em]"
                >
                  {word}
                </span>
              ))}
            </h3>
            <p className="font-body text-[11px] md:text-xs tracking-[0.18em] uppercase text-bs-cream/40 mt-3">
              {event.venue}
            </p>
          </header>

          {event.description ? (
            <p className="font-body text-sm leading-relaxed text-bs-cream/55 max-w-[48ch] [text-wrap:pretty]">
              {event.description}
            </p>
          ) : null}

          {typeof event.capacity === "number" && event.capacity > 0 ? (
            <p className="font-body text-[10px] tracking-[0.25em] uppercase text-bs-cream/30">
              cap · {event.capacity}
            </p>
          ) : null}

          <div className="pt-3">
            <button
              type="button"
              onClick={() => onRegisterClick(event)}
              data-bs-cta
              className="group/cta inline-flex items-center gap-3 min-h-[44px] px-7 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-sm tracking-[0.2em] uppercase rounded-sm shadow-[0_0_0_1px_rgba(255,255,243,0.08)] hover:shadow-[0_0_0_1px_rgba(255,255,243,0.3),0_8px_32px_rgba(255,255,243,0.1)] transition-shadow duration-300 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-bs-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Entra in lista
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                className="transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none"
              >
                <path
                  d="M2 8h11M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="square"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom signature line, draws on enter as final flourish */}
        <span
          aria-hidden="true"
          data-bs-line
          className="absolute bottom-0 inset-x-7 md:inset-x-10 h-px bg-bs-cream/[0.08] origin-left scale-x-0"
        />
      </div>
    </article>
  );
}
