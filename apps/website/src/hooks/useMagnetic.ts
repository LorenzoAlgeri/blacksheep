"use client";

import { useCallback, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const MAX_OFFSET = 8; // px

/**
 * Hook that makes an element subtly follow the cursor position.
 * Returns a ref and event handlers to spread onto the target element.
 * Disabled on touch devices and when prefers-reduced-motion is active.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const prefersReduced = useReducedMotion();

  const isTouch = typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches;
  const disabled = prefersReduced || isTouch;

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = ((e.clientX - centerX) / (rect.width / 2)) * MAX_OFFSET;
      const dy = ((e.clientY - centerY) / (rect.height / 2)) * MAX_OFFSET;
      gsap.to(ref.current, { x: dx, y: dy, duration: 0.3, ease: "power2.out" });
    },
    [disabled],
  );

  const onMouseLeave = useCallback(() => {
    if (disabled || !ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
  }, [disabled]);

  return { ref, onMouseMove, onMouseLeave };
}
