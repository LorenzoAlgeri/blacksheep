"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, SCROLL_TRIGGER_DEFAULTS } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({
  end,
  duration = 1.5,
  suffix = "",
  prefix = "",
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !ref.current) return;
      const proxy = { value: 0 };
      gsap.to(proxy, {
        value: end,
        duration,
        ease: EASE.move,
        scrollTrigger: { trigger: ref.current, ...SCROLL_TRIGGER_DEFAULTS },
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = `${prefix}${Math.round(proxy.value)}${suffix}`;
          }
        },
      });
    },
    { dependencies: [prefersReduced, end] },
  );

  return (
    <span ref={ref} className={className}>
      {prefersReduced ? `${prefix}${end}${suffix}` : `${prefix}0${suffix}`}
    </span>
  );
}
