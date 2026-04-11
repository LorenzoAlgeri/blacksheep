"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, SCROLL_TRIGGER_DEFAULTS } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export function GoldDivider({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !ref.current) return;
      gsap.from(ref.current, {
        scaleX: 0,
        duration: DURATION.standard,
        ease: EASE.enter,
        scrollTrigger: { trigger: ref.current, ...SCROLL_TRIGGER_DEFAULTS },
      });
    },
    { dependencies: [prefersReduced] },
  );

  return (
    <div
      ref={ref}
      data-motion
      className={`h-px w-24 mx-auto bg-gradient-to-r from-transparent via-bs-cream/20 to-transparent ${className}`}
    />
  );
}
