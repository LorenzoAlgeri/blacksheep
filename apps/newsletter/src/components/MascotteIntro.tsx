"use client";

import { useEffect, useState } from "react";
import { MascotteIntroV0Img } from "./mascot/V0Img";
import { MascotteIntroV9CanvasDown } from "./mascot/V9CanvasDown";
import { MascotteIntroV9CanvasUp } from "./mascot/V9CanvasUp";
import { MascotteIntroVideoAlpha } from "./mascot/VideoAlpha";

// Re-export lifecycle event names for downstream consumers
// (LandingMotion, EventsListGate). All variants emit the same events.
export {
  MASCOTTE_BYPASS_EVENT,
  MASCOTTE_END_EVENT,
  MASCOTTE_REVEAL_EVENT,
  MASCOTTE_START_EVENT,
} from "./mascot/shared";

const VARIANTS = [
  "v0",
  "v9",
  "v9d",
  "video",
  "video-lit",
  "video-glow",
  "video-sharp",
  "video-bloom",
] as const;
type Variant = (typeof VARIANTS)[number];
const DEFAULT: Variant = "video-bloom";

function isVariant(v: string | null): v is Variant {
  return !!v && (VARIANTS as readonly string[]).includes(v);
}

/** URL switcher for A/B testing intro implementations.
 *
 *  - `?mascot=v0`         → <img> src loop (production deployed baseline)
 *  - `?mascot=v9`         → canvas + DPR×2 backing UPSAMPLE (broken)
 *  - `?mascot=v9d`        → canvas + 0.5× backing DOWNSAMPLE
 *  - `?mascot=video`      → VP9 webm alpha (hardware decode, flat look)
 *  - `?mascot=video-lit`  → VP9 + CSS contrast/saturate boost
 *  - `?mascot=video-glow` → VP9 + boost + mix-blend-mode screen (default)
 *
 *  Lifecycle events identical across variants. */
export function MascotteIntro() {
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("mascot");
    setVariant(isVariant(fromUrl) ? fromUrl : DEFAULT);
  }, []);

  if (variant === null) return null; // SSR / first paint — pick a variant client-side
  switch (variant) {
    case "v0":
      return <MascotteIntroV0Img />;
    case "v9":
      return <MascotteIntroV9CanvasUp />;
    case "v9d":
      return <MascotteIntroV9CanvasDown />;
    case "video":
      return <MascotteIntroVideoAlpha look="flat" />;
    case "video-lit":
      return <MascotteIntroVideoAlpha look="lit" />;
    case "video-glow":
      return <MascotteIntroVideoAlpha look="glow" />;
    case "video-sharp":
      return <MascotteIntroVideoAlpha look="sharp" />;
    case "video-bloom":
      return <MascotteIntroVideoAlpha look="bloom" />;
  }
}
