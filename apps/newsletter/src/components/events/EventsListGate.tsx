"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MASCOTTE_END_EVENT } from "@/components/MascotteIntro";

/**
 * Last-resort safety net: if MASCOTTE_END_EVENT never fires (lazy
 * chunk failure, first-frame load error), reveal the EventsList
 * after this many ms from page mount so the page is never stuck
 * with the list locked away.
 */
const FALLBACK_TIMEOUT_MS = 5000;

interface EventsListGateProps {
  children: ReactNode;
}

/**
 * Minimal gate around the EventsList — provides a11y isolation only.
 *
 * Why so small: previous variants tried to combine scroll-locking,
 * opacity fade-in, and scroll-restoration overrides. Each combination
 * produced a one-second "flash and disappear" of the section heading
 * after the mascotte intro on certain reload paths. None of the
 * targeted fixes (`history.scrollRestoration='manual'`, scrollTo(0,0)
 * pin, transition removal) eliminated it on every browser. The
 * pragmatic answer is to remove the moving parts: render the list
 * normally below the fold, let the mascot's fixed-inset overlay hide
 * it during the intro the same way it hides everything else, and use
 * `inert` + `aria-hidden` purely so keyboard / screen reader users
 * cannot enter the list while the mascot is on stage.
 *
 * Visually there is no fade and no scroll lock — when the mascotte
 * unmounts at MASCOTTE_END_EVENT, the list is simply already there
 * underneath. No flash because there is no transition to mistime.
 */
export function EventsListGate({ children }: EventsListGateProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }

    const reveal = () => setRevealed(true);
    const fallback = window.setTimeout(reveal, FALLBACK_TIMEOUT_MS);
    window.addEventListener(MASCOTTE_END_EVENT, reveal, { once: true });

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener(MASCOTTE_END_EVENT, reveal);
    };
  }, []);

  return (
    <div
      aria-hidden={!revealed}
      inert={!revealed}
      data-events-gate-revealed={revealed}
      // visibility: hidden / visible is an instant toggle — no
      // transition value can mistime, so there's no fade-flash window
      // where the heading "appears for a second and disappears". The
      // section still reserves layout space (unlike display:none) so
      // there is zero layout shift when revealed flips.
      style={{ visibility: revealed ? "visible" : "hidden" }}
    >
      {children}
    </div>
  );
}
