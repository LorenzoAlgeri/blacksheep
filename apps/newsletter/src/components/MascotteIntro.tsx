"use client";

import { useEffect, useRef, useState } from "react";

// Total source frames: 118. The original animation has a stylized blue
// dissolve from frame ~107 onward that we don't want, so we stop at
// frame 100 (clean end-of-pose) and CSS-fade the mascot out.
const PLAY_UNTIL = 100;
// Reveal early so the GSAP entrance can finish before the mascot fades
// out — frame 50 at 30fps lands at ~1.67s into the intro, leaving
// ~1.66s of mascot stage time for the hero entrance to play out.
const REVEAL_FRAME = 50;
const FPS = 30;
const FRAME_DURATION_MS = 1000 / FPS;
// How long to keep the final pose on screen before fading the whole
// container out.
const HOLD_AFTER_END_MS = 350;
// Duration of the CSS fade-out (must match the Tailwind `duration-`
// below).
const FADE_OUT_MS = 600;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type MascotteBypassWindow = Window & { __bsSkipMascotte__?: boolean };

/** Mascot frame loop has actually started rendering. Lets the gate /
 *  hero entrance arm a "did the intro really begin" fallback that's
 *  measured from the real start signal rather than from page mount. */
export const MASCOTTE_START_EVENT = "bs-mascotte-start";
/** Frame index reached REVEAL_FRAME — hero entrance can play. */
export const MASCOTTE_REVEAL_EVENT = "bs-mascotte-reveal";
/** Mascot finished its fade-out — gate can open the events list. */
export const MASCOTTE_END_EVENT = "bs-mascotte-end";
/** External signal to abort the intro and unmount immediately
 *  (used by the LandingMotion boot-fallback when the intro never
 *  starts — e.g. WebP chunk failure). */
export const MASCOTTE_BYPASS_EVENT = "bs-mascotte-bypass";

const framePath = (i: number) => `${BASE_PATH}/mascot-frames/m${String(i).padStart(3, "0")}.webp`;

export function MascotteIntro() {
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const runtimeWindow = window as MascotteBypassWindow;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isBypassed = () => runtimeWindow.__bsSkipMascotte__ === true;
    const timeouts: number[] = [];

    const fireStart = () => window.dispatchEvent(new CustomEvent(MASCOTTE_START_EVENT));
    const fireReveal = () => window.dispatchEvent(new CustomEvent(MASCOTTE_REVEAL_EVENT));
    const fireEnd = () => window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));

    // External bypass — if LandingMotion (or anything else) decides the
    // intro is broken, abort the frame loop and unmount the container.
    const handleBypass = () => {
      runtimeWindow.__bsSkipMascotte__ = true;
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
    };
    window.addEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);

    if (prefersReducedMotion || isBypassed()) {
      // Reduced-motion users (and visitors who land after a bypass was
      // already raised) skip the intro entirely. Fire the lifecycle
      // events synchronously so downstream listeners (LandingMotion,
      // EventsListGate) don't sit waiting on a signal that will never
      // come.
      fireStart();
      fireReveal();
      fireEnd();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return () => {
        window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
      };
    }

    const frames: HTMLImageElement[] = [];
    for (let i = 0; i <= PLAY_UNTIL; i++) {
      const img = new Image();
      img.src = framePath(i);
      frames.push(img);
    }

    let revealed = false;

    const playFrom = (startTime: number) => {
      // Emit start once we actually begin the rAF loop, so the gate /
      // hero entrance know the intro is alive (and not stuck on a
      // never-loading frame 0).
      fireStart();

      const tick = (now: number) => {
        if (isBypassed()) return; // bypass handler already cancelled — don't rearm rAF
        const elapsed = now - startTime;
        const frame = Math.min(PLAY_UNTIL, Math.floor(elapsed / FRAME_DURATION_MS));
        const img = imgRef.current;
        if (img && frames[frame]?.src) img.src = frames[frame].src;
        if (!revealed && frame >= REVEAL_FRAME) {
          revealed = true;
          fireReveal();
        }
        if (frame >= PLAY_UNTIL) {
          // Hold the final pose briefly, then fade out, then unmount.
          timeouts.push(
            window.setTimeout(() => {
              setFading(true);
              timeouts.push(
                window.setTimeout(() => {
                  fireEnd();
                  setDone(true);
                }, FADE_OUT_MS),
              );
            }, HOLD_AFTER_END_MS),
          );
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (isBypassed()) return;
      playFrom(performance.now());
    };

    if (frames[0].complete) {
      start();
    } else {
      frames[0].addEventListener("load", start, { once: true });
      frames[0].addEventListener("error", start, { once: true });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      data-mascotte-intro
      className={`pointer-events-none fixed inset-0 z-[2] overflow-hidden transition-opacity duration-[600ms] ease-out ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <img
        ref={imgRef}
        src={framePath(0)}
        alt=""
        draggable={false}
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[center_bottom] select-none"
      />
    </div>
  );
}
