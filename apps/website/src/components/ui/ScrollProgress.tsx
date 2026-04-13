"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [prefersReduced]);

  if (prefersReduced) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60]">
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(to right, rgba(255,255,243,0.5), var(--bs-cream))",
          boxShadow: "0 0 8px rgba(255,255,243,0.3)",
        }}
      />
    </div>
  );
}
