"use client";

import { useEffect, useRef, useState } from "react";
import {
  FADE_OUT_MS,
  FRAME_DURATION_MS,
  HOLD_AFTER_END_MS,
  MASCOTTE_BYPASS_EVENT,
  MascotteBypassWindow,
  PLAY_UNTIL,
  REVEAL_FRAME,
  fireEnd,
  fireReveal,
  fireStart,
  framePath,
} from "./shared";

/** V0 — production deployed: <img> src swapped via rAF (~30 FPS). */
export function MascotteIntroV0Img() {
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const runtimeWindow = window as MascotteBypassWindow;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isBypassed = () => runtimeWindow.__bsSkipMascotte__ === true;
    const timeouts: number[] = [];

    const handleBypass = () => {
      runtimeWindow.__bsSkipMascotte__ = true;
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      setDone(true);
    };
    window.addEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);

    if (prefersReducedMotion || isBypassed()) {
      fireStart();
      fireReveal();
      fireEnd();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return () => window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
    }

    const frames: HTMLImageElement[] = [];
    for (let i = 0; i <= PLAY_UNTIL; i++) {
      const img = new Image();
      img.src = framePath(i);
      frames.push(img);
    }

    let revealed = false;

    const playFrom = (startTime: number) => {
      fireStart();
      const tick = (now: number) => {
        if (isBypassed()) return;
        const elapsed = now - startTime;
        const frame = Math.min(PLAY_UNTIL, Math.floor(elapsed / FRAME_DURATION_MS));
        const img = imgRef.current;
        if (img && frames[frame]?.src) img.src = frames[frame].src;
        if (!revealed && frame >= REVEAL_FRAME) {
          revealed = true;
          fireReveal();
        }
        if (frame >= PLAY_UNTIL) {
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

    if (frames[0].complete) {
      playFrom(performance.now());
    } else {
      frames[0].addEventListener("load", () => playFrom(performance.now()), { once: true });
      frames[0].addEventListener("error", () => playFrom(performance.now()), { once: true });
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
        className="absolute inset-0 h-full w-full object-cover object-[36%_bottom] select-none"
      />
    </div>
  );
}
