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

      if (prefersReducedMotion) {
        // Everything visible, no motion
        gsap.set("[data-motion]", { opacity: 1 });
        gsap.set("[data-motion='scritta']", {
          clipPath: "inset(0 0% 0 0)",
          filter: "blur(0px)",
        });
        gsap.set("[data-motion='location']", { opacity: 1 });
        gsap.set("[data-motion='divider']", { opacity: 0.3 });
        gsap.set("[data-motion='microcopy']", { opacity: 1 });
        gsap.set("[data-motion='consent']", { opacity: 1 });
        gsap.set("[data-motion='socials']", { opacity: 1 });
        gsap.set("[data-motion='mascotte']", { opacity: 0.85, x: 0 });
        return;
      }

      // --- Ambient motion: "Sei nel club" ---
      // All timing based on 4s base cycle (15 BPM):
      //   4s = base (logo breathing, logo glow)
      //   2s = half (divider pulse, CTA glow)
      //   8s = double (shimmer repeat)
      //  12s = triple (spotlight drift)
      const mm = gsap.matchMedia();

      function startAmbientMotion() {
        // Desktop: full ambient animations
        mm.add("(min-width: 641px)", () => {
          // 0. Scritta ambient — subtle scale breathing, 8s double cycle
          gsap.to("[data-motion='scritta']", {
            scale: 1.025,
            duration: 8,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });

          // 1. Logo breathing — 4s base cycle, visible float + scale
          gsap.to("[data-motion='logo']", {
            scale: 1.12,
            y: -4,
            opacity: 0.75,
            duration: 4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });

          // 2. Logo glow — 4s cycle, offset 1s from breathing
          gsap.to("[data-motion='logo'] svg", {
            filter: "drop-shadow(0 0 40px rgba(255,255,243,0.45))",
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
        });

        // Mobile: lightweight ambient only (divider + shimmer)
        mm.add("(max-width: 640px)", () => {
          // Shimmer only — lightweight, GPU-friendly
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

        // Both: divider pulse + shimmer on desktop
        gsap.to("[data-motion='divider']", {
          opacity: 0.4,
          duration: 2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // Desktop shimmer (mobile handled above with longer delay)
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
        gsap.set("[data-motion='mascotte']", { opacity: 0.85, x: 0 });
        // On revisit: seek video to end (frozen at last frame)
        const revisitVideo = containerRef.current?.querySelector<HTMLVideoElement>(
          "[data-motion='mascotte']",
        );
        if (revisitVideo) {
          revisitVideo
            .play()
            .then(() => {
              // Let it play to end naturally, it freezes at last frame
            })
            .catch(() => {
              /* poster shown as fallback */
            });
        }
        gsap.set("[data-motion='gradient']", { opacity: 1 });
        gsap.set("[data-motion='scritta']", {
          clipPath: "inset(0 0% 0 0)",
          filter: "blur(0px)",
          opacity: 1,
        });
        gsap.set("[data-motion='every-monday']", { opacity: 1, y: 0 });
        gsap.set("[data-motion='logo']", { opacity: 1, scale: 1 });
        gsap.set("[data-motion='logo'] svg", {
          filter: "drop-shadow(0 0 30px rgba(255,255,243,0.15))",
        });
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

      // --- Initial hidden states (before paint via useLayoutEffect timing) ---
      gsap.set("[data-motion='mascotte']", { opacity: 0, x: -20 });
      gsap.set("[data-motion='gradient']", { opacity: 0 });
      gsap.set("[data-motion='scritta']", {
        clipPath: "inset(0 100% 0 0)",
        filter: "blur(8px)",
        opacity: 1,
      });
      gsap.set("[data-motion='every-monday']", { opacity: 0, y: -5 });
      gsap.set("[data-motion='logo']", { opacity: 0, scale: 0.7 });
      gsap.set("[data-motion='logo'] svg", {
        filter: "drop-shadow(0 0 30px rgba(255,255,243,0))",
      });
      gsap.set("[data-motion='location']", { opacity: 0 });
      gsap.set("[data-motion='divider']", { opacity: 0 });
      gsap.set("[data-motion='input']", { opacity: 0, y: 12 });
      gsap.set("[data-motion='cta']", { opacity: 0, scale: 0.97 });
      gsap.set("[data-motion='socials']", { opacity: 0 });
      gsap.set("[data-motion='microcopy']", { opacity: 0 });
      gsap.set("[data-motion='consent']", { opacity: 0 });
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
      tl.to("[data-motion='gradient']", { opacity: 1, duration: 0.8, ease: "power2.inOut" }, 0.4);

      // PHASE 2: IL RICONOSCIMENTO (1.2 – 2.5s) — brand emerges
      // 1.2s: Scritta SVG — clip-path reveal + blur-to-focus
      tl.to(
        "[data-motion='scritta']",
        { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power3.out" },
        1.2,
      );
      tl.to(
        "[data-motion='scritta']",
        { filter: "blur(0px)", duration: 0.6, ease: "power2.out" },
        1.2,
      );

      // 1.8s: Logo icon materializes with decisive overshoot + glow (tight with scritta)
      tl.to(
        "[data-motion='logo']",
        { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" },
        1.8,
      );
      tl.to(
        "[data-motion='logo'] svg",
        {
          filter: "drop-shadow(0 0 30px rgba(255,255,243,0.15))",
          duration: 0.8,
          ease: "power2.out",
        },
        1.8,
      );

      // 2.3s: "EVERY MONDAY" — fast, discrete context
      tl.to(
        "[data-motion='every-monday']",
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
        2.3,
      );

      // 2.5s: Location text — ghost opacity, just context
      tl.to("[data-motion='location']", { opacity: 1, duration: 0.3, ease: "power2.out" }, 2.5);

      // PHASE 3: LA DISCESA (2.7 – 3.5s) — calm, the form appears
      // 2.7s: Divider fades to ambient start level (0.2)
      tl.to("[data-motion='divider']", { opacity: 0.2, duration: 0.3, ease: "power2.out" }, 2.7);

      // 2.8s: Input fields slide up with stagger
      tl.to(
        "[data-motion='input']",
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" },
        2.8,
      );

      // 3.1s: CTA — glow breathing starts DURING fade-in
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

      // 3.3s: Socials, microcopy, consent, "the place to be" — ghost presence
      tl.to("[data-motion='socials']", { opacity: 0.75, duration: 0.3, ease: "power2.out" }, 3.3);
      tl.to("[data-motion='microcopy']", { opacity: 0.7, duration: 0.3, ease: "power2.out" }, 3.3);
      tl.to("[data-motion='consent']", { opacity: 1, duration: 0.3, ease: "power2.out" }, 3.3);

      // Spotlight fades in during Phase 2 for ambient readiness
      tl.to("[data-motion='spotlight']", { opacity: 0.05, duration: 1.5, ease: "power1.out" }, 1.2);

      // Mascotte slide-in from left, synced with scritta reveal
      tl.to(
        "[data-motion='mascotte']",
        {
          opacity: 0.85,
          x: 0,
          duration: 0.6,
          ease: "power2.out",
        },
        1.5,
      );

      // Start mascotte video playback when it appears
      tl.call(
        () => {
          const video = containerRef.current?.querySelector<HTMLVideoElement>(
            "[data-motion='mascotte']",
          );
          if (video) {
            video.play().catch(() => {
              /* autoplay policy */
            });
          }
        },
        [],
        1.5,
      );

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
      {/* Ambient spotlight — slow-drifting club light, 350px radius, 5% opacity */}
      <div
        data-motion="spotlight"
        className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(circle_350px,rgba(255,255,243,0.05),transparent)]"
      />
      {children}
    </div>
  );
}
