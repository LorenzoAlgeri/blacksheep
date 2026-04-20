"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function LandingMotion({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Cancel CSS fallback — GSAP is now in control
      document.querySelectorAll("[data-motion]").forEach((el) => {
        (el as HTMLElement).style.animation = "none";
      });

      // --- Ambient motion: "Sei nel club" ---
      const mm = gsap.matchMedia();

      function startAmbientMotion() {
        mm.add("(min-width: 641px)", () => {
          gsap.to("[data-motion='logo']", {
            scale: 1.025,
            duration: 8,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.to("[data-motion='logo'] svg", {
            filter: "drop-shadow(0 0 40px rgba(255,255,243,0.45))",
            duration: 4,
            delay: 1,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.to("[data-motion='spotlight']", {
            x: "12%",
            y: "-8%",
            duration: 12,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });

        mm.add("(max-width: 640px)", () => {
          gsap.fromTo(
            ".shimmer-text",
            { backgroundPosition: "150% 0" },
            {
              backgroundPosition: "-50% 0",
              duration: 3.5,
              ease: "power2.inOut",
              repeat: -1,
              repeatDelay: 6,
            },
          );
        });

        gsap.to("[data-motion='divider']", {
          opacity: 0.4,
          duration: 2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        mm.add("(min-width: 641px)", () => {
          gsap.fromTo(
            ".shimmer-text",
            { backgroundPosition: "150% 0" },
            {
              backgroundPosition: "-50% 0",
              duration: 3.5,
              ease: "power2.inOut",
              repeat: -1,
              repeatDelay: 4,
            },
          );
        });
      }

      // --- Reduced motion: skip everything ---
      if (prefersReducedMotion) {
        gsap.set("[data-motion]", { opacity: 1 });
        gsap.set("[data-motion='logo']", {
          clipPath: "inset(0 0% 0 0)",
          filter: "blur(0px)",
        });
        gsap.set("[data-motion='location']", { opacity: 1 });
        gsap.set("[data-motion='divider']", { opacity: 0.3 });
        gsap.set("[data-motion='microcopy']", { opacity: 1 });
        gsap.set("[data-motion='consent']", { opacity: 1 });
        gsap.set("[data-motion='socials']", { opacity: 1 });
        return;
      }

      // --- Check sessionStorage: skip entrance on revisit ---
      let hasSeenEntrance = false;
      try {
        hasSeenEntrance = !!sessionStorage.getItem("bs-entrance-seen");
      } catch {
        // sessionStorage unavailable — always show entrance
      }

      if (hasSeenEntrance) {
        // Set everything to final visible state
        gsap.set("[data-motion='gradient']", { opacity: 1 });
        gsap.set("[data-motion='logo']", {
          clipPath: "inset(0 0% 0 0)",
          filter: "blur(0px)",
          opacity: 1,
        });
        gsap.set("[data-motion='logo'] svg", {
          filter: "drop-shadow(0 0 30px rgba(255,255,243,0.15))",
        });
        gsap.set("[data-motion='every-monday']", { opacity: 1, y: 0 });
        gsap.set("[data-motion='location']", { opacity: 1 });
        gsap.set("[data-motion='divider']", { opacity: 0.2 });
        gsap.set("[data-motion='input']", { opacity: 1, y: 0 });
        gsap.set("[data-motion='cta']", { opacity: 1, scale: 1 });
        gsap.set("[data-motion='socials']", { opacity: 1 });
        gsap.set("[data-motion='microcopy']", { opacity: 1 });
        gsap.set("[data-motion='consent']", { opacity: 1 });
        gsap.set("[data-motion='spotlight']", { opacity: 0.05 });
        containerRef.current
          ?.querySelector("[data-motion='cta']")
          ?.classList.add("cta-glow-active");
        startAmbientMotion();
        return;
      }

      // ===================================================
      // FIRST VISIT — Landing Entrance
      // ===================================================

      // --- Initial hidden states ---
      gsap.set("[data-motion='gradient']", { opacity: 0 });
      gsap.set("[data-motion='logo']", {
        clipPath: "inset(0 100% 0 0)",
        filter: "blur(8px)",
        opacity: 1,
      });
      gsap.set("[data-motion='logo'] svg", {
        filter: "drop-shadow(0 0 30px rgba(255,255,243,0))",
      });
      gsap.set("[data-motion='every-monday']", { opacity: 0, y: -5 });
      gsap.set("[data-motion='location']", { opacity: 0 });
      gsap.set("[data-motion='divider']", { opacity: 0 });
      gsap.set("[data-motion='input']", { opacity: 0, y: 12 });
      gsap.set("[data-motion='cta']", { opacity: 0, scale: 0.97 });
      gsap.set("[data-motion='socials']", { opacity: 0 });
      gsap.set("[data-motion='microcopy']", { opacity: 0 });
      gsap.set("[data-motion='consent']", { opacity: 0 });
      gsap.set("[data-motion='spotlight']", { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          try {
            sessionStorage.setItem("bs-entrance-seen", "true");
          } catch {
            /* ignore */
          }
          startAmbientMotion();
        },
      });

      // PHASE 1: gradient emerges
      tl.to("[data-motion='gradient']", { opacity: 1, duration: 0.8, ease: "power2.inOut" }, 0);

      // PHASE 2: brand reveals
      tl.to(
        "[data-motion='logo']",
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.8,
          ease: "power3.out",
        },
        0.8,
      );
      tl.to(
        "[data-motion='logo']",
        { filter: "blur(0px)", duration: 0.6, ease: "power2.out" },
        0.8,
      );
      tl.to(
        "[data-motion='logo'] svg",
        {
          filter: "drop-shadow(0 0 30px rgba(255,255,243,0.15))",
          duration: 0.8,
          ease: "power2.out",
        },
        1.4,
      );

      tl.to(
        "[data-motion='every-monday']",
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
        1.9,
      );
      tl.to("[data-motion='location']", { opacity: 1, duration: 0.3, ease: "power2.out" }, 2.1);

      // PHASE 3: form appears
      tl.to("[data-motion='divider']", { opacity: 0.2, duration: 0.3, ease: "power2.out" }, 2.3);
      tl.to(
        "[data-motion='input']",
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out",
        },
        2.4,
      );
      tl.to(
        "[data-motion='cta']",
        { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" },
        2.7,
      );
      tl.call(
        () => {
          containerRef.current
            ?.querySelector("[data-motion='cta']")
            ?.classList.add("cta-glow-active");
        },
        [],
        2.7,
      );

      tl.to("[data-motion='socials']", { opacity: 0.75, duration: 0.3, ease: "power2.out" }, 2.9);
      tl.to("[data-motion='microcopy']", { opacity: 0.7, duration: 0.3, ease: "power2.out" }, 2.9);
      tl.to("[data-motion='consent']", { opacity: 1, duration: 0.3, ease: "power2.out" }, 2.9);

      tl.to("[data-motion='spotlight']", { opacity: 0.05, duration: 1.5, ease: "power1.out" }, 0.8);

      return () => {
        mm.revert();
      };
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="relative flex flex-1 flex-col overflow-x-hidden">
      {/* Animated background gradient */}
      <div
        data-motion="gradient"
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] pointer-events-none z-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,243,0.04)_0%,rgba(255,255,243,0.02)_30%,transparent_65%)]"
      />
      {/* Ambient spotlight — slow-drifting club light */}
      <div
        data-motion="spotlight"
        className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(circle_350px,rgba(255,255,243,0.05),transparent)]"
      />
      {children}
    </div>
  );
}
