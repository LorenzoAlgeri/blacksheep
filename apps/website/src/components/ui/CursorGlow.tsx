"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    let rafId: number;
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (el) {
          el.style.left = `${e.clientX}px`;
          el.style.top = `${e.clientY}px`;
          el.style.opacity = "1";
        }
      });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReduced]);

  if (prefersReduced) return null;

  return (
    <div
      ref={ref}
      className="fixed w-[200px] h-[200px] rounded-full pointer-events-none z-[45] opacity-0 -translate-x-1/2 -translate-y-1/2"
      style={{
        background: "radial-gradient(circle, rgba(255,255,243,0.03) 0%, transparent 70%)",
        transition: "opacity 0.3s",
      }}
    />
  );
}
