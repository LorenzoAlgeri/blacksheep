"use client";

import { useEffect, useRef, useState } from "react";
import {
  BASE_PATH,
  FADE_OUT_MS,
  FPS,
  HOLD_AFTER_END_MS,
  MASCOTTE_BYPASS_EVENT,
  MascotteBypassWindow,
  PLAY_UNTIL,
  REVEAL_FRAME,
  fireEnd,
  fireReveal,
  fireStart,
} from "./shared";

// Animated WebP (q=88, ~2.9MB, alpha preserved). Replaces the previous
// VP9 webm + alpha approach because iOS WebKit (and therefore EVERY
// browser on iOS — Apple forces WebKit) ignores the VP9 alpha channel
// and renders the yuva420p fill colour as a black box. WebP animation
// is decoded as an image and works uniformly on Safari iOS 14+,
// Chrome / Firefox / Edge desktop + mobile, and Android browsers.
const ANIM_SRC = `${BASE_PATH}/intro-mascot.webp`;
const REVEAL_TIME_MS = (REVEAL_FRAME / FPS) * 1000;
const TOTAL_TIME_MS = (PLAY_UNTIL / FPS) * 1000;

export type VideoLook = "flat" | "lit" | "glow" | "sharp" | "bloom";

const LOOK_STYLE: Record<VideoLook, React.CSSProperties> = {
  flat: {},
  // Light boost: barely-there contrast/saturate.
  lit: { filter: "contrast(1.08) saturate(1.05) brightness(1.03)" },
  glow: {
    filter: "contrast(1.25) brightness(1.1) saturate(1.15)",
    mixBlendMode: "screen",
  },
  sharp: {
    filter: "url(#bs-mascot-sharpen) contrast(1.18) saturate(1.08) brightness(1.05)",
  },
  // Glare bloom — designer-canonical "shiny metal" post-fx on bracelet
  // pearls + necklace chain. Outer brightness/contrast lift compensates
  // for any palette darkening introduced by the WebP encoder.
  bloom: {
    filter: "brightness(1.04) contrast(1.2) url(#bs-mascot-bloom)",
  },
};

/** Animated-WebP intro variant.
 *  - Single <img> element (no <video> = no codec-alpha browser issues)
 *  - Browser-decoded animation, frame timing baked into the asset
 *  - Lifecycle events scheduled via setTimeout from the reference FPS
 *    constants, NOT from a video.currentTime tick — animated webp has
 *    no JS API for current frame
 *  - Filter chain (LOOK_STYLE) applied to the <img> exactly like it
 *    was on the <video>: SVG bloom + CSS contrast/brightness work
 *    identically on both. */
export function MascotteIntroVideoAlpha({ look = "flat" }: { look?: VideoLook } = {}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const runtimeWindow = window as MascotteBypassWindow;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isBypassed = () => runtimeWindow.__bsSkipMascotte__ === true;
    const timeouts: number[] = [];
    let cancelled = false;

    const handleBypass = () => {
      runtimeWindow.__bsSkipMascotte__ = true;
      cancelled = true;
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

    const startScheduling = () => {
      if (cancelled || isBypassed()) return;
      fireStart();
      timeouts.push(
        window.setTimeout(() => {
          if (!cancelled) fireReveal();
        }, REVEAL_TIME_MS),
      );
      timeouts.push(
        window.setTimeout(() => {
          if (cancelled) return;
          timeouts.push(
            window.setTimeout(() => {
              if (!cancelled) setFading(true);
              timeouts.push(
                window.setTimeout(() => {
                  if (cancelled) return;
                  fireEnd();
                  setDone(true);
                }, FADE_OUT_MS),
              );
            }, HOLD_AFTER_END_MS),
          );
        }, TOTAL_TIME_MS),
      );
    };

    const onError = () => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
    };

    const img = imgRef.current;
    if (!img) {
      window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
      return () => window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
    }

    if (img.complete && img.naturalWidth > 0) {
      // Asset already decoded (cached from previous load) — kick off
      // the lifecycle immediately. The animated webp restarts from
      // frame 0 every time it's mounted in the DOM.
      startScheduling();
    } else {
      img.addEventListener("load", startScheduling, { once: true });
      img.addEventListener("error", onError, { once: true });
    }

    return () => {
      cancelled = true;
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
      img.removeEventListener("load", startScheduling);
      img.removeEventListener("error", onError);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      data-mascotte-intro
      className={`pointer-events-none fixed inset-0 z-[2] overflow-hidden transition-opacity duration-[600ms] ease-out ${fading ? "opacity-0" : "opacity-100"}`}
    >
      {look === "sharp" || look === "bloom" ? (
        <svg
          aria-hidden="true"
          className="absolute h-0 w-0 overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Sharpen — Laplacian edge kernel */}
            <filter id="bs-mascot-sharpen" x="0" y="0" width="100%" height="100%">
              <feConvolveMatrix
                order="3"
                preserveAlpha="true"
                kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"
              />
            </filter>
            {/* Glare bloom — physical-render shiny-metal post-fx.
                Threshold tuned so only near-white pixels survive:
                bracelet pearls + necklace chain + cap text — NOT the
                body sweater (~0.85) or eye whites.
                1. ColorMatrix: alpha = R+G+B - 1.40, gates pixels.
                2. ComponentTransfer slope 10: amplifies the small
                   surviving alpha so the bloom is visible without
                   widening the threshold band.
                3. feFlood white → composite "in" → pure white bright
                   layer with the gated alpha.
                4. Erode 0.67 — kills isolated 1-2px dots.
                5. Two gaussian blurs for a tight "shine".
                6. feMerge stacks the layers over the original. */}
            <filter id="bs-mascot-bloom" x="-10%" y="-10%" width="120%" height="120%">
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        1 1 1 0 -1.40"
                result="brightAlpha"
              />
              <feComponentTransfer in="brightAlpha" result="brightAlphaSteep">
                <feFuncA type="linear" slope="10" intercept="0" />
              </feComponentTransfer>
              <feFlood floodColor="#ffffff" result="white" />
              <feComposite in="white" in2="brightAlphaSteep" operator="in" result="brightOnly" />
              {/* Tentativo 1: simplified filter chain.
                  Removed feMorphology erode + one of the two
                  feGaussianBlur. The remaining single blur (stdDev
                  2.5) gives a "shine" close enough to the previous
                  two-pass without the per-frame morphology cost. */}
              <feGaussianBlur in="brightOnly" stdDeviation="2.5" result="blurShine" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="blurShine" />
                <feMergeNode in="brightOnly" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      ) : null}
      <img
        ref={imgRef}
        src={ANIM_SRC}
        alt=""
        draggable={false}
        loading="eager"
        fetchPriority="high"
        style={{
          ...LOOK_STYLE[look],
          willChange: "filter",
        }}
        className="absolute inset-x-0 bottom-0 h-[65%] w-full object-cover object-[36%_bottom] select-none"
      />
    </div>
  );
}
