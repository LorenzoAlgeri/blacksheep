"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function ConfirmMotion({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        gsap.set("[data-confirm]", { opacity: 1 });
        gsap.set("[data-confirm='spotlight']", { opacity: 0.05 });
        return;
      }

      // Initial hidden states
      gsap.set("[data-confirm='spotlight']", { opacity: 0 });
      gsap.set("[data-confirm='logo']", { opacity: 0, scale: 0.7 });
      gsap.set("[data-confirm='title']", { opacity: 0, y: 20 });
      gsap.set("[data-confirm='subtitle']", { opacity: 0 });
      gsap.set("[data-confirm='divider']", { opacity: 0 });
      gsap.set("[data-confirm='back']", { opacity: 0 });

      // Entrance timeline
      const tl = gsap.timeline();

      // Spotlight ambient fade
      tl.to(
        "[data-confirm='spotlight']",
        {
          opacity: 0.05,
          duration: 1.2,
          ease: "power1.out",
        },
        0,
      );

      // Logo: scale-in with overshoot
      tl.to(
        "[data-confirm='logo']",
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "back.out(1.7)",
        },
        0.2,
      );

      // Logo glow pulse on arrival
      tl.fromTo(
        "[data-confirm='logo'] svg",
        { filter: "drop-shadow(0 0 0px rgba(255,255,243,0))" },
        {
          filter: "drop-shadow(0 0 40px rgba(255,255,243,0.3))",
          duration: 0.8,
          ease: "power2.out",
        },
        0.4,
      );
      tl.to(
        "[data-confirm='logo'] svg",
        {
          filter: "drop-shadow(0 0 20px rgba(255,255,243,0.1))",
          duration: 1.2,
          ease: "power2.inOut",
        },
        1.2,
      );

      // Title: slide-up + fade
      tl.to(
        "[data-confirm='title']",
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
        },
        0.5,
      );

      // Divider
      tl.to(
        "[data-confirm='divider']",
        {
          opacity: 0.15,
          duration: 0.4,
          ease: "power2.out",
        },
        0.7,
      );

      // Subtitle: fade
      tl.to(
        "[data-confirm='subtitle']",
        {
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
        0.8,
      );

      // Back link
      tl.to(
        "[data-confirm='back']",
        {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        },
        1.0,
      );

      // Ambient: logo gentle breathing
      tl.call(() => {
        gsap.to("[data-confirm='logo']", {
          scale: 1.06,
          duration: 4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.to("[data-confirm='spotlight']", {
          x: "8%",
          y: "-5%",
          duration: 10,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="relative flex flex-1 flex-col overflow-x-hidden">
      {/* Ambient spotlight */}
      <div
        data-confirm="spotlight"
        className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(circle_400px_at_50%_30%,rgba(255,255,243,0.06),transparent)]"
      />
      {children}
    </div>
  );
}
