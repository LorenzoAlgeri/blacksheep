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

const VARIANTS = ["v0", "v9", "v9d", "video"] as const;
type Variant = (typeof VARIANTS)[number];
const DEFAULT: Variant = "v9d"; // leading hypothesis: downsample → glow

function isVariant(v: string | null): v is Variant {
  return !!v && (VARIANTS as readonly string[]).includes(v);
}

/** URL switcher for A/B testing intro implementations.
 *
 *  - `?mascot=v0`    → <img> src loop (production deployed baseline)
 *  - `?mascot=v9`    → canvas + DPR×2 backing UPSAMPLE (current rotto)
 *  - `?mascot=v9d`   → canvas + 0.5× backing DOWNSAMPLE (glow hypothesis)
 *  - `?mascot=video` → <video> with VP9 alpha webm (hardware decode)
 *
 *  Default: v9d. Lifecycle events identical across variants. */
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
      return <MascotteIntroVideoAlpha />;
  }
}
