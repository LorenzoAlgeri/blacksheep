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

      if (prefersReducedMotion) {
        // Everything visible, no motion
        gsap.set("[data-motion]", { opacity: 1 });
        gsap.set("[data-motion='title']", {
          clipPath: "inset(0 0% 0 0)",
          filter: "blur(0px)",
        });
        gsap.set("[data-motion='location']", { opacity: 0.25 });
        gsap.set("[data-motion='divider']", { opacity: 0.3 });
        gsap.set("[data-motion='microcopy']", { opacity: 0.35 });
        gsap.set("[data-motion='footer']", { opacity: 0.35 });
        return;
      }

      // --- Ambient motion: "Sei nel club" ---
      // All timing based on 4s base cycle (15 BPM):
      //   4s = base (logo breathing, logo glow)
      //   2s = half (divider pulse, CTA glow)
      //   8s = double (shimmer repeat)
      //  12s = triple (spotlight drift)
      function startAmbientMotion() {
        // 1. Logo breathing — 4s base cycle
        gsap.to("[data-motion='logo']", {
          scale: 1.05,
          opacity: 0.8,
          duration: 4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // 2. Logo glow — 4s cycle, offset 1s from breathing
        // Glow FOLLOWS scale: when logo is at max scale, glow is still rising.
        gsap.to("[data-motion='logo'] svg", {
          filter: "drop-shadow(0 0 30px rgba(255,255,243,0.3))",
          duration: 4,
          delay: 1,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // 3. Spotlight slow drift — 12s triple cycle
        gsap.to("[data-motion='spotlight']", {
          x: "12%",
          y: "-8%",
          duration: 12,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // 4. Divider pulse — 2s half cycle (from current 0.2, no fromTo)
        gsap.to("[data-motion='divider']", {
          opacity: 0.4,
          duration: 2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // 5. Shimmer "EVERY MONDAY" — 1.2s flash every 8s (double cycle)
        gsap.to(".shimmer-text", {
          backgroundPosition: "-200% 0",
          duration: 1.2,
          ease: "power2.inOut",
          repeat: -1,
          repeatDelay: 8,
        });

        // CTA glow is CSS (2s cycle), activated via class during entrance
      }

      // --- Check sessionStorage: skip entrance on revisit ---
      // Wrapped in try/catch: Safari private mode throws SecurityError on sessionStorage access
      let hasSeenEntrance = false;
      try {
        hasSeenEntrance = !!sessionStorage.getItem("bs-entrance-seen");
      } catch {
        // sessionStorage unavailable — always show entrance
      }

      if (hasSeenEntrance) {
        // Set everything to final visible state immediately
        gsap.set("[data-motion='gradient']", { opacity: 1 });
        gsap.set("[data-motion='logo']", { opacity: 1, scale: 1 });
        gsap.set("[data-motion='logo'] svg", {
          filter: "drop-shadow(0 0 30px rgba(255,255,243,0.15))",
        });
        gsap.set("[data-motion='every-monday']", { opacity: 1, y: 0 });
        gsap.set("[data-motion='title']", {
          clipPath: "inset(0 0% 0 0)",
          filter: "blur(0px)",
        });
        gsap.set("[data-motion='location']", { opacity: 0.25 });
        gsap.set("[data-motion='divider']", { opacity: 0.2 });
        gsap.set("[data-motion='input']", { opacity: 1, y: 0 });
        gsap.set("[data-motion='cta']", { opacity: 1, scale: 1 });
        gsap.set("[data-motion='microcopy']", { opacity: 0.35 });
        gsap.set("[data-motion='footer']", { opacity: 0.35 });
        gsap.set("[data-motion='spotlight']", { opacity: 0.05 });
        containerRef.current
          ?.querySelector("[data-motion='cta']")
          ?.classList.add("cta-glow-active");
        startAmbientMotion();
        return;
      }

      // --- Initial hidden states (before paint via useLayoutEffect timing) ---
      gsap.set("[data-motion='gradient']", { opacity: 0 });
      gsap.set("[data-motion='logo']", { opacity: 0, scale: 0.7 });
      gsap.set("[data-motion='logo'] svg", {
        filter: "drop-shadow(0 0 30px rgba(255,255,243,0))",
      });
      gsap.set("[data-motion='every-monday']", { opacity: 0, y: -5 });
      gsap.set("[data-motion='title']", {
        clipPath: "inset(0 100% 0 0)",
        filter: "blur(8px)",
      });
      gsap.set("[data-motion='location']", { opacity: 0 });
      gsap.set("[data-motion='divider']", { opacity: 0 });
      gsap.set("[data-motion='input']", { opacity: 0, y: 12 });
      gsap.set("[data-motion='cta']", { opacity: 0, scale: 0.97 });
      gsap.set("[data-motion='microcopy']", { opacity: 0 });
      gsap.set("[data-motion='footer']", { opacity: 0 });
      gsap.set("[data-motion='spotlight']", { opacity: 0 });

      // --- Entrance timeline: "Entri nel club" ---
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

      // PHASE 1: IL BUIO (0 – 1.2s) — suspense
      // 0.0–0.4s: deliberate darkness. Nothing happens. Tension builds.
      // 0.4s: background gradient — eyes adjusting to the dark
      tl.to("[data-motion='gradient']", { opacity: 1, duration: 0.8, ease: "power2.inOut" }, 0.4);

      // PHASE 2: IL RICONOSCIMENTO (1.2 – 2.0s) — brand emerges
      // 1.2s: Logo materializes with decisive overshoot + glow lights up
      tl.to(
        "[data-motion='logo']",
        { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" },
        1.2,
      );
      tl.to(
        "[data-motion='logo'] svg",
        {
          filter: "drop-shadow(0 0 30px rgba(255,255,243,0.15))",
          duration: 0.8,
          ease: "power2.out",
        },
        1.2,
      );

      // 1.6s: "EVERY MONDAY" — fast, discrete context
      tl.to(
        "[data-motion='every-monday']",
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
        1.6,
      );

      // PHASE 3: IL DROP (2.0 – 2.7s) — the WOW moment
      // 2.0s: "BLACK SHEEP" — clip-path reveal + blur-to-focus, simultaneous
      // Blur clears faster (600ms) than clip opens (800ms) — text sharpens
      // while still being revealed, like stage lights cutting through fog.
      tl.to(
        "[data-motion='title']",
        { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power3.out" },
        2.0,
      );
      tl.to(
        "[data-motion='title']",
        { filter: "blur(0px)", duration: 0.6, ease: "power2.out" },
        2.0,
      );

      // 2.5s: Location text — ghost opacity, just context
      tl.to("[data-motion='location']", { opacity: 0.25, duration: 0.3, ease: "power2.out" }, 2.5);

      // PHASE 4: LA DISCESA (2.7 – 3.5s) — calm, the form appears
      // 2.7s: Divider fades to ambient start level (0.2)
      tl.to("[data-motion='divider']", { opacity: 0.2, duration: 0.3, ease: "power2.out" }, 2.7);

      // 2.8s: Input fields slide up with stagger
      tl.to(
        "[data-motion='input']",
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" },
        2.8,
      );

      // 3.1s: CTA — glow breathing starts DURING fade-in so it feels alive
      tl.to(
        "[data-motion='cta']",
        { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" },
        3.1,
      );
      tl.call(
        () => {
          containerRef.current
            ?.querySelector("[data-motion='cta']")
            ?.classList.add("cta-glow-active");
        },
        [],
        3.1,
      );

      // 3.3s: Microcopy + footer — ghost presence
      tl.to("[data-motion='microcopy']", { opacity: 0.35, duration: 0.3, ease: "power2.out" }, 3.3);
      tl.to("[data-motion='footer']", { opacity: 0.35, duration: 0.3, ease: "power2.out" }, 3.3);

      // Spotlight fades in during Phase 2 for ambient readiness
      tl.to("[data-motion='spotlight']", { opacity: 0.05, duration: 1.5, ease: "power1.out" }, 1.2);
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
      {/* Ambient spotlight — slow-drifting club light, 350px radius, 5% opacity */}
      <div
        data-motion="spotlight"
        className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(circle_350px,rgba(255,255,243,0.05),transparent)]"
      />
      {children}
    </div>
  );
}
