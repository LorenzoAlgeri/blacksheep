"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeading({ children, className = "" }: SectionHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !ref.current) return;
      gsap.from(ref.current, {
        ...ENTRANCE.heading,
        duration: DURATION.major,
        ease: EASE.enter,
        scrollTrigger: { trigger: ref.current, ...SCROLL_TRIGGER_DEFAULTS },
      });
    },
    { dependencies: [prefersReduced] },
  );

  return (
    <h2
      ref={ref}
      data-motion
      className={`font-brand text-bs-cream uppercase tracking-[0.15em] text-center text-2xl sm:text-3xl md:text-4xl ${className}`}
    >
      {children}
    </h2>
  );
}
