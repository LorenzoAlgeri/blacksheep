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
  framePath,
} from "./shared";

const VIDEO_SRC = `${BASE_PATH}/intro-mascot-alpha.webm`;
const REVEAL_TIME_S = REVEAL_FRAME / FPS;
const TOTAL_TIME_S = PLAY_UNTIL / FPS;

export type VideoLook = "flat" | "lit" | "glow" | "sharp" | "bloom";

const LOOK_STYLE: Record<VideoLook, React.CSSProperties> = {
  flat: {},
  // Light boost: barely-there contrast/saturate. Lorenzo's preferred
  // baseline tone — keeps the source palette and just lifts highlights.
  lit: { filter: "contrast(1.08) saturate(1.05) brightness(1.03)" },
  glow: {
    filter: "contrast(1.25) brightness(1.1) saturate(1.15)",
    mixBlendMode: "screen",
  },
  // Sharpen via SVG feConvolveMatrix — re-defines sub-pixel details
  // (bracelet pearls, necklace chain) that VP9 4:2:0 chroma
  // subsampling smudged. Combined with moderate contrast boost.
  sharp: {
    filter: "url(#bs-mascot-sharpen) contrast(1.18) saturate(1.08) brightness(1.05)",
  },
  // Glare bloom — designer-canonical post-processing for "shiny metal"
  // look on bracelet pearls and necklace chain. SVG pipeline extracts
  // bright pixels, gaussian-blurs them, additive-blends back over the
  // original. Tuned threshold so only pearls + chain + cap text bloom,
  // not sweater body (~0.85). Outer brightness lift compensates for
  // VP9's BT.709-limited-range darkening vs the canvas-rendered ref.
  bloom: {
    filter: "brightness(1.04) contrast(1.2) url(#bs-mascot-bloom)",
  },
};

/** Video — single VP9 webm with alpha channel (yuva420p). Browser
 *  hardware-decodes the stream → smooth nativo. The CSS `look` prop
 *  re-applies the canvas-pipeline-style highlight amplification that
 *  was visible in screenshot 192150 but isn't preserved by the lossy/
 *  lossless VP9 → <video> color management chain. */
export function MascotteIntroVideoAlpha({ look = "flat" }: { look?: VideoLook } = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const [videoReady, setVideoReady] = useState(false);
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

    // Build the per-frame tick. Called once `play()` resolves so the
    // first visible frame is guaranteed to be frame 0 (the placeholder
    // <img> stays up until then) — fixes the "intro looks accelerated"
    // bug where autoPlay started decoding/advancing before the
    // crossfade swapped img→video.
    const startTick = () => {
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

    // canplay = first frame decoded & ready to render. The <video>
    // element has NO autoPlay attribute, so the browser hasn't started
    // playback yet. Sequence:
    //   1. pause() + currentTime=0 (defensive, in case browser
    //      heuristic auto-played anyway).
    //   2. setVideoReady(true) → React schedules a re-render that
    //      flips opacity (video 0→1, img 1→0).
    //   3. Double rAF waits for two paints: by the second callback
    //      the opacity transition has begun on a video element that
    //      is *paused at frame 0* (identical to the placeholder img).
    //   4. play() starts the actual playback exactly at frame 0, so
    //      the first moving frame the user sees is genuinely frame 0
    //      — no apparent acceleration.
    //   5. play() resolve → startTick() begins the rAF lifecycle
    //      tick that fires reveal/end events.
    const onCanPlay = () => {
      if (!videoRef.current || started || cancelled) return;
      const v = videoRef.current;
      v.pause();
      v.currentTime = 0;
      setVideoReady(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!videoRef.current || started || cancelled) return;
          videoRef.current
            .play()
            .then(startTick)
            .catch(() => {
              window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
            });
        });
      });
    };

    const onError = () => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_BYPASS_EVENT));
    };

    let cancelled = false;
    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("error", onError, { once: true });

    // Fallback if "canplay" never fires (rare, but defensive). Uses
    // a longer timeout than the framerate since canplay can take
    // ~500ms+ on a fresh page load even with cached video.
    const fallbackBoot = window.setTimeout(() => {
      if (!started) onCanPlay();
    }, 1500);
    timeouts.push(fallbackBoot);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
      video.removeEventListener("canplay", onCanPlay);
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
                Threshold tuned so only near-white pixels (luminance
                > ~0.95) survive: bracelet pearls + necklace chain +
                cap text — NOT the body sweater (~0.85) or eye whites.
                1. ColorMatrix: alpha = R+G+B - 2.85, gates pixels.
                2. ComponentTransfer slope 5: amplifies the small
                   surviving alpha so the bloom is visible without
                   widening the threshold band.
                3. feFlood white → composite "in" → pure white bright
                   layer with the gated alpha.
                4. Two gaussian blurs (small + medium) for a tight
                   "shine" rather than a giant halo.
                5. feMerge stacks blurs over the original. */}
            <filter id="bs-mascot-bloom" x="-10%" y="-10%" width="120%" height="120%">
              {/* Threshold formula alpha = R+G+B - 2.65 → pixels with
                  luminance avg > ~0.88 enter the bloom path. The body
                  sweater sits around 0.83-0.85 so it stays out; pearls
                  + chain + cap text reach 0.92-1.0. Slope 6 then
                  amplifies the borderline alpha so the bloom is
                  visible without lowering the gate further. */}
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
                <feFuncA type="linear" slope="20" intercept="0" />
              </feComponentTransfer>
              <feFlood floodColor="#ffffff" result="white" />
              <feComposite in="white" in2="brightAlphaSteep" operator="in" result="brightOnly" />
              {/* Erode 0.5px: kills isolated 1-2px specular dots from
                  the 3D source render. Pearls (3-5px clusters) survive
                  since erosion only thins their edges; the center
                  remains and the gaussian blur fills back the radius. */}
              <feMorphology in="brightOnly" operator="erode" radius="0.67" result="brightCleaned" />
              <feGaussianBlur in="brightCleaned" stdDeviation="3" result="blurNear" />
              <feGaussianBlur in="brightCleaned" stdDeviation="2" result="blurFar" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="blurFar" />
                <feMergeNode in="blurNear" />
                <feMergeNode in="brightCleaned" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      ) : null}
      {/* Frame 0 placeholder — visible from first paint while the
          ~950KB VP9 alpha webm (CRF 24) downloads + decodes the
          first frame. Same LOOK_STYLE filter as the video so the
          opacity crossfade at play() resolution is invisible.
          Eliminates the gradient-only flash before the intro starts. */}
      <img
        src={framePath(0)}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="eager"
        fetchPriority="high"
        style={{ ...LOOK_STYLE[look], opacity: videoReady ? 0 : 1 }}
        className="absolute inset-x-0 bottom-0 h-[65%] w-full object-cover object-[36%_bottom] select-none transition-opacity duration-200"
      />
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        style={{
          ...LOOK_STYLE[look],
          opacity: videoReady ? 1 : 0,
          willChange: "opacity, filter",
        }}
        className="absolute inset-x-0 bottom-0 h-[65%] w-full object-cover object-[36%_bottom] select-none transition-opacity duration-100"
      />
    </div>
  );
}
