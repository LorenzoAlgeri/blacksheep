"use client";

import { useEffect, useRef, useState } from "react";
import {
  BASE_PATH,
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

const SPLASH_FADE_MS = 400;
const FAKE_BAR_DURATION_MS = 1200;
const TRANSPARENT_PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function MascotteIntroV0Img() {
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
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
      setDone(true);
      return () => window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
    }

    const frames: HTMLImageElement[] = [];
    let loadedCount = 0;

    const playFrom = (startTime: number) => {
      fireStart();
      let revealed = false;
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

    const startAnimation = () => {
      setReady(true);
      timeouts.push(
        window.setTimeout(() => {
          playFrom(performance.now());
        }, SPLASH_FADE_MS),
      );
    };

    const totalFrames = PLAY_UNTIL + 1;
    let framesReady = false;
    let splashDone = false;

    const tryStart = () => {
      if (framesReady && splashDone) startAnimation();
    };

    const onFrameReady = () => {
      loadedCount++;
      if (loadedCount >= totalFrames) {
        framesReady = true;
        tryStart();
      }
    };

    timeouts.push(
      window.setTimeout(() => {
        splashDone = true;
        tryStart();
      }, FAKE_BAR_DURATION_MS),
    );

    for (let i = 0; i <= PLAY_UNTIL; i++) {
      const img = new Image();
      img.addEventListener("load", onFrameReady, { once: true });
      img.addEventListener("error", onFrameReady, { once: true });
      img.src = framePath(i);
      frames.push(img);
    }

    if (frames.every((f) => f.complete)) {
      loadedCount = totalFrames;
      framesReady = true;
      tryStart();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
    };
  }, []);

  if (done) return null;

  return (
    <>
      {/* Splash — fixed indipendente, NON dentro data-mascotte-intro
          così lo slide non sposta logo+barra */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[3] flex flex-col items-center justify-center transition-opacity ease-out"
        style={{
          opacity: ready ? 0 : 1,
          transitionDuration: `${SPLASH_FADE_MS}ms`,
        }}
      >
        {/* riga 148: logo — w-14 = larghezza, opacity-25 = trasparenza */}
        <img
          src={`${BASE_PATH}/bs-logo.svg`}
          alt=""
          draggable={false}
          className="w-14 opacity-25 select-none"
          style={{
            filter:
              "brightness(0) saturate(100%) invert(99%) sepia(3%) saturate(200%) hue-rotate(30deg)",
          }}
        />
        {/* riga 158: barra fittizia — width 5.5rem, durata FAKE_BAR_DURATION_MS (riga 19) */}
        <div
          className="mt-5 h-[1.5px] overflow-hidden rounded-full"
          style={{ width: "5.5rem", background: "rgba(255,255,243,0.08)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: "0%",
              background: "rgba(255,255,243,0.35)",
              transition: `width ${FAKE_BAR_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
            ref={(el) => {
              if (el) requestAnimationFrame(() => (el.style.width = "100%"));
            }}
          />
        </div>
      </div>

      {/* Mascotte — container con slide animation */}
      <div
        aria-hidden="true"
        data-mascotte-intro
        className={`pointer-events-none fixed inset-0 z-[2] overflow-hidden transition-opacity duration-[600ms] ease-out ${fading ? "opacity-0" : "opacity-100"}`}
      >
        {/* riga 185: MASCOTTE
            h-[65%]                    → ALTEZZA (% del viewport)
            bottom-0                   → POSIZIONE VERTICALE (0 = fondo, bottom-[5%] la alza)
            object-[36%_bottom]        → CROP: 36% = punto focale orizzontale, bottom = crop dal basso
        */}
        <img
          ref={imgRef}
          src={TRANSPARENT_PX}
          alt=""
          draggable={false}
          loading="eager"
          fetchPriority="high"
          className="absolute inset-x-0 bottom-0 h-[45%] md:h-[80%] w-full object-cover object-[36%_bottom] select-none transition-opacity ease-out"
          style={{
            opacity: ready ? 1 : 0,
            transitionDuration: `${SPLASH_FADE_MS}ms`,
          }}
        />
      </div>
    </>
  );
}
