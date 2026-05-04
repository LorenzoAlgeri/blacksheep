"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MASCOTTE_END_EVENT } from "@/components/MascotteIntro";

/**
 * Buffer beyond the mascotte intro's natural duration. Mascotte runs
 * ~3.33s of frames + 350ms hold + 600ms fade ≈ 4280ms total. The
 * fallback sits above that so the timeout only fires when the intro is
 * actually broken (e.g. WebP frames fail to load and the reveal/end
 * events never dispatch). Otherwise the gate opens precisely on
 * MASCOTTE_END_EVENT — keeps the fade-in synced with the mascotte
 * leaving the viewport, no overlap flicker.
 */
const FALLBACK_TIMEOUT_MS = 5000;

interface EventsListGateProps {
  children: ReactNode;
}

/**
 * Client-side gate that delays the EventsList reveal until the mascotte
 * intro has finished. Also locks page scroll while gated, so the user
 * can't scroll past the hero during the intro fade-out (which would
 * otherwise leave them past the section heading the moment the gate
 * opens, making it look like the heading "appears and disappears").
 *
 * a11y:
 *  - `aria-hidden` while gated → screen readers skip the list during intro
 *  - `pointer-events-none` while gated → CTA cannot accidentally receive focus
 *  - prefers-reduced-motion → mount immediately, no fade and no scroll lock
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

    // Lock scroll until the mascotte intro completes. Both html and body
    // need overflow:hidden because the scrolling element varies (Chrome
    // uses <html>, some quirks-mode contexts use <body>). Restore exact
    // previous values to avoid clobbering admin/global styles.
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const release = () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };

    const timeoutId = window.setTimeout(() => {
      release();
      setMounted(true);
    }, FALLBACK_TIMEOUT_MS);
    const handler = () => {
      window.clearTimeout(timeoutId);
      release();
      setMounted(true);
    };
    window.addEventListener(MASCOTTE_END_EVENT, handler);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(MASCOTTE_END_EVENT, handler);
      release();
    };
  }, []);

  return (
    <div
      aria-hidden={!mounted}
      data-events-gate-mounted={mounted ? "true" : "false"}
      className={`transition-opacity duration-700 ease-out ${
        mounted ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {children}
    </div>
  );
}
