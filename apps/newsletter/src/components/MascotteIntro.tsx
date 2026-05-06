"use client";

import { useEffect, useRef, useState } from "react";

const PLAY_UNTIL = 100;
const REVEAL_FRAME = 50;
const FPS = 30;
const FRAME_DURATION_MS = 1000 / FPS;
const HOLD_AFTER_END_MS = 350;
const FADE_OUT_MS = 600;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type MascotteBypassWindow = Window & { __bsSkipMascotte__?: boolean };

export const MASCOTTE_START_EVENT = "bs-mascotte-start";
export const MASCOTTE_REVEAL_EVENT = "bs-mascotte-reveal";
export const MASCOTTE_END_EVENT = "bs-mascotte-end";
export const MASCOTTE_BYPASS_EVENT = "bs-mascotte-bypass";

const framePath = (i: number) => `${BASE_PATH}/mascot-frames/m${String(i).padStart(3, "0")}.webp`;

export function MascotteIntro() {
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

    const fireStart = () => window.dispatchEvent(new CustomEvent(MASCOTTE_START_EVENT));
    const fireReveal = () => window.dispatchEvent(new CustomEvent(MASCOTTE_REVEAL_EVENT));
    const fireEnd = () => window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));

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
      return () => {
        window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
      };
    }

    let revealed = false;

    const playFrom = (startTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !bitmaps[0]) return;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      const intrinsicW = bitmaps[0].width;
      const intrinsicH = bitmaps[0].height;
      // DPR cap 2 — V4-original recipe. Higher caps blow memory and
      // re-introduce mobile jitter (see V6 in RECAP).
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(intrinsicW * dpr);
      canvas.height = Math.round(intrinsicH * dpr);
      ctx.scale(dpr, dpr);
      // High-quality smoothing on a DPR-scaled backing is what produces
      // the bracelet/necklace highlight glow Lorenzo wants. Do NOT switch
      // to backing 1:1 + premultiplyAlpha:none (V8): it kills the effect.
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
        // Defaults: premultiplyAlpha "default", colorSpaceConversion "default".
        // These defaults are exactly what produces the highlight glow on
        // semi-transparent edges. Specifying premultiplyAlpha:"none"
        // (V8) removes the effect.
        const bm = await createImageBitmap(blob);
        if (cancelled) {
          bm.close();
          return;
        }
        bitmaps[i] = bm;
      } catch {
        // Skip individual frame failures — tick() guards on null.
      }
    };

    const preDecodeAll = async () => {
      // Decode in parallel. For 101 frames this resolves in a few hundred
      // ms on desktop and ~1s on mid-range mobile — the <img> placeholder
      // covers the wait so the user sees frame 0 from first paint.
      await Promise.all(Array.from({ length: PLAY_UNTIL + 1 }, (_, i) => decodeFrame(i)));
      if (cancelled || isBypassed()) return;
      if (!bitmaps[0]) {
        // Frame 0 failed → cannot start the canvas loop. Bypass so the
        // gate doesn't hang waiting for events that won't fire.
        window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
        return;
      }
      setBitmapsReady(true);
      playFrom(performance.now());
    };

    preDecodeAll();

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
      {/* Placeholder visible from first paint until bitmaps are
          decoded — eliminates the V4 boot delay without sacrificing the
          canvas pipeline that produces the highlight glow. */}
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
