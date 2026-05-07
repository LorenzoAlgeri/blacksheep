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

/** V9 — canvas + ImageBitmap pre-decode + DPR-scaled backing (UPSAMPLE).
 *  Backing = intrinsicW * dpr (cap 2). ctx.scale(dpr,dpr). drawImage 1:1.
 *  Smoothing high. Theory was "DPR upsample produces glow" — turns out it
 *  doesn't (looks blurry / no glow). Kept here for A/B comparison. */
export function MascotteIntroV9CanvasUp() {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [bitmapsReady, setBitmapsReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const runtimeWindow = window as MascotteBypassWindow;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isBypassed = () => runtimeWindow.__bsSkipMascotte__ === true;
    const timeouts: number[] = [];
    let cancelled = false;
    const bitmaps: (ImageBitmap | null)[] = new Array(PLAY_UNTIL + 1).fill(null);

    const closeBitmaps = () => {
      for (const bm of bitmaps) bm?.close();
    };

    const handleBypass = () => {
      runtimeWindow.__bsSkipMascotte__ = true;
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      closeBitmaps();
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

    let revealed = false;

    const playFrom = (startTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !bitmaps[0]) return;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;
      const intrinsicW = bitmaps[0].width;
      const intrinsicH = bitmaps[0].height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(intrinsicW * dpr);
      canvas.height = Math.round(intrinsicH * dpr);
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      fireStart();

      const tick = (now: number) => {
        if (isBypassed() || cancelled) return;
        const elapsed = now - startTime;
        const frame = Math.min(PLAY_UNTIL, Math.floor(elapsed / FRAME_DURATION_MS));
        const bm = bitmaps[frame];
        if (bm) {
          ctx.clearRect(0, 0, intrinsicW, intrinsicH);
          ctx.drawImage(bm, 0, 0, intrinsicW, intrinsicH);
        }
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

    const decodeFrame = async (i: number): Promise<void> => {
      try {
        const res = await fetch(framePath(i));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const bm = await createImageBitmap(blob);
        if (cancelled) {
          bm.close();
          return;
        }
        bitmaps[i] = bm;
      } catch {
        // tick() guards on null
      }
    };

    void (async () => {
      await Promise.all(Array.from({ length: PLAY_UNTIL + 1 }, (_, i) => decodeFrame(i)));
      if (cancelled || isBypassed()) return;
      if (!bitmaps[0]) {
        window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
        return;
      }
      setBitmapsReady(true);
      playFrom(performance.now());
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
      closeBitmaps();
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
        style={{ opacity: bitmapsReady ? 0 : 1 }}
        className="absolute inset-0 h-full w-full object-cover object-[36%_bottom] select-none transition-opacity duration-200"
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ opacity: bitmapsReady ? 1 : 0 }}
        className="absolute inset-0 h-full w-full object-cover object-[36%_bottom] select-none transition-opacity duration-200"
      />
    </div>
  );
}
