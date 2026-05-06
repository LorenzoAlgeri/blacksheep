"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MASCOTTE_END_EVENT, MASCOTTE_START_EVENT } from "@/components/MascotteIntro";

/**
 * If the mascotte never starts (lazy chunk / first-frame failure),
 * recover the events list after this many ms from page mount. Generous
 * because the bypass path in LandingMotion will already have fired
 * MASCOTTE_END synthetically by then in most failure modes — this is
 * the last-ditch safety net.
 */
const INTRO_BOOT_FALLBACK_MS = 5200;

/**
 * Once the mascot intro has actually started, the END event should fire
 * after ~3.33s of frames + 0.35s hold + 0.6s fade ≈ 4.28s. This buffer
 * keeps the gate closed while the real intro plays out and only opens
 * synthetically if a slow device drops frames late in the sequence.
 */
const END_FALLBACK_FROM_START_MS = 5000;

interface EventsListGateProps {
  children: ReactNode;
}

/**
 * Client-side gate that delays the EventsList reveal until the mascotte
 * intro has finished. The gate is now purely visual: it does NOT lock
 * page scroll, so the user can read the form / hero copy / scroll the
 * page freely while the mascot completes its intro independently.
 *
 * Two-stage fallback timer mirrors LandingMotion: a generous "did the
 * intro ever start" boot timeout kicks in if MASCOTTE_START_EVENT never
 * fires, and a tighter "did the intro ever finish" stage measured from
 * the real start signal protects against a stalled rAF loop. Both
 * collapse to a no-op if MASCOTTE_END_EVENT arrives normally.
 *
 * a11y:
 *  - `inert={!mounted}` → descendants stay out of the tab order while
 *    gated (better than `pointer-events-none`, which only stops the
 *    mouse and lets keyboard tab into invisible content);
 *  - `aria-hidden={!mounted}` → screen readers skip the list until it's
 *    visible;
 *  - prefers-reduced-motion → mount immediately, no fade.
 */
export function EventsListGate({ children }: EventsListGateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }

    let started = false;
    let opened = false;
    let bootFallbackId: number | null = window.setTimeout(() => {
      setMounted(true);
    }, INTRO_BOOT_FALLBACK_MS);
    let endFallbackId: number | null = null;

    const openGate = () => {
      if (opened) return;
      opened = true;
      if (bootFallbackId) window.clearTimeout(bootFallbackId);
      if (endFallbackId) window.clearTimeout(endFallbackId);
      setMounted(true);
    };

    const handleMascotteStart = () => {
      if (started || opened) return;
      started = true;
      if (bootFallbackId) {
        window.clearTimeout(bootFallbackId);
        bootFallbackId = null;
      }
      endFallbackId = window.setTimeout(openGate, END_FALLBACK_FROM_START_MS);
    };

    window.addEventListener(MASCOTTE_START_EVENT, handleMascotteStart);
    window.addEventListener(MASCOTTE_END_EVENT, openGate);

    return () => {
      if (bootFallbackId) window.clearTimeout(bootFallbackId);
      if (endFallbackId) window.clearTimeout(endFallbackId);
      window.removeEventListener(MASCOTTE_START_EVENT, handleMascotteStart);
      window.removeEventListener(MASCOTTE_END_EVENT, openGate);
    };
  }, []);

  return (
    <div
      aria-hidden={!mounted}
      inert={!mounted}
      data-events-gate-mounted={mounted ? "true" : "false"}
      className={`transition-opacity duration-700 ease-out ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
