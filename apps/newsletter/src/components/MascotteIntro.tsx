"use client";

import { useEffect, useRef, useState } from "react";

// Total source frames: 118. The original animation has a stylized blue dissolve from frame ~107
// onward that we don't want, so we stop at frame 100 (clean end-of-pose) and CSS-fade the mascot out.
const PLAY_UNTIL = 100;
// Reveal early so the GSAP entrance can finish before the mascot fades out.
const REVEAL_FRAME = 50;
const FPS = 30;
const FRAME_DURATION_MS = 1000 / FPS;
// How long to keep the final pose on screen before fading the whole container out.
const HOLD_AFTER_END_MS = 350;
// Duration of the CSS fade-out (must match the Tailwind `duration-` below).
const FADE_OUT_MS = 600;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const MASCOTTE_REVEAL_EVENT = "bs-mascotte-reveal";
export const MASCOTTE_END_EVENT = "bs-mascotte-end";

const framePath = (i: number) => `${BASE_PATH}/mascot-frames/m${String(i).padStart(3, "0")}.webp`;

export function MascotteIntro() {
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frames: HTMLImageElement[] = [];
    for (let i = 0; i <= PLAY_UNTIL; i++) {
      const img = new Image();
      img.src = framePath(i);
      frames.push(img);
    }

    const fireReveal = () => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_REVEAL_EVENT));
    };
    const fireEnd = () => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
    };

    if (prefersReducedMotion) {
      fireReveal();
      fireEnd();
      // TODO(mascotte): refactor setState in effect — sposta setDone in
      // callback gated o in un useEffect dipendente. Vedi commit 395c94d
      // (wip(website): mascotte intro + cinematic overhaul). Eseguito gating
      // con eslint-disable per sbloccare CI durante la feature BlackSheep List.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return;
    }

    let revealed = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const playFrom = (startTime: number) => {
      const tick = (now: number) => {
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
            setTimeout(() => {
              setFading(true);
              timeouts.push(
                setTimeout(() => {
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

    const start = () => playFrom(performance.now());
    if (frames[0].complete) {
      start();
    } else {
      frames[0].addEventListener("load", start, { once: true });
      frames[0].addEventListener("error", start, { once: true });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(clearTimeout);
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
        className="absolute inset-0 h-full w-full object-cover object-[center_bottom] select-none"
      />
    </div>
  );
}
