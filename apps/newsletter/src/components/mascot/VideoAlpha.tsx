"use client";

import { useEffect, useRef, useState } from "react";
import {
  BASE_PATH,
  FADE_OUT_MS,
  FPS,
  FRAME_DURATION_MS,
  HOLD_AFTER_END_MS,
  MASCOTTE_BYPASS_EVENT,
  MascotteBypassWindow,
  PLAY_UNTIL,
  REVEAL_FRAME,
  fireEnd,
  fireReveal,
  fireStart,
} from "./shared";

const VIDEO_SRC = `${BASE_PATH}/intro-mascot-alpha.webm`;
const REVEAL_TIME_S = REVEAL_FRAME / FPS;
const TOTAL_TIME_S = PLAY_UNTIL / FPS;

/** Video — single VP9 webm with alpha channel (yuva420p). Browser
 *  hardware-decodes the stream → smooth nativo. If alpha encoding
 *  worked, no black background. If not, you'll see black bg = ffmpeg
 *  alpha mode failed and we need a different encoder. */
export function MascotteIntroVideoAlpha() {
  const videoRef = useRef<HTMLVideoElement>(null);
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

    const video = videoRef.current;
    if (!video) {
      window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
      return;
    }

    let revealed = false;
    let started = false;

    const onPlay = () => {
      if (started) return;
      started = true;
      fireStart();
      const tick = () => {
        if (isBypassed() || !videoRef.current) return;
        const t = videoRef.current.currentTime;
        if (!revealed && t >= REVEAL_TIME_S) {
          revealed = true;
          fireReveal();
        }
        if (t >= TOTAL_TIME_S || videoRef.current.ended) {
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

    const onError = () => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
    };

    video.addEventListener("playing", onPlay, { once: true });
    video.addEventListener("error", onError, { once: true });

    // Fallback for browsers that don't fire "playing" reliably.
    const fallbackBoot = window.setTimeout(() => {
      if (!started) onPlay();
    }, FRAME_DURATION_MS * 2);
    timeouts.push(fallbackBoot);

    return () => {
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
      video.removeEventListener("playing", onPlay);
      video.removeEventListener("error", onError);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      data-mascotte-intro
      className={`pointer-events-none fixed inset-0 z-[2] overflow-hidden transition-opacity duration-[600ms] ease-out ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover object-[36%_bottom] select-none"
      />
    </div>
  );
}
