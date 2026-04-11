"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";

gsap.registerPlugin(ScrollTrigger);

interface DJ {
  name: string;
  initials: string;
  genre: string;
}

const DJS: DJ[] = [
  { name: "DJ NOOR", initials: "DN", genre: "Hip-Hop / Trap" },
  { name: "EMME", initials: "EM", genre: "R&B / Neo Soul" },
  { name: "KAIROS", initials: "KS", genre: "Afrobeats / Dancehall" },
  { name: "VEGA", initials: "VG", genre: "House / UK Garage" },
  { name: "ZERO", initials: "ZR", genre: "Old School / Boom Bap" },
];

export function DJResidents() {
  const containerRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !containerRef.current) return;

      const cards = cardsRef.current.filter(Boolean);
      if (cards.length === 0) return;

      // Slide from right — carousel "unrolling" effect
      gsap.from(cards, {
        ...ENTRANCE.fromRightWide,
        duration: DURATION.major,
        ease: EASE.enter,
        stagger: 0.12,
        scrollTrigger: {
          trigger: containerRef.current,
          ...SCROLL_TRIGGER_DEFAULTS,
        },
      });
    },
    { dependencies: [prefersReduced] },
  );

  return (
    <section id="dj-residents" className="section-padding" ref={containerRef}>
      <SectionHeading>DJ RESIDENTS</SectionHeading>
      <GoldDivider className="mt-4 mb-10" />

      <div
        tabIndex={0}
        role="region"
        aria-label="DJ Residents carousel"
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {DJS.map((dj, i) => (
          <div
            key={dj.name}
            ref={(el) => {
              if (el) cardsRef.current[i] = el;
            }}
            data-motion
            className="group dj-card snap-start shrink-0 w-[280px] md:w-[320px] rounded-lg bg-[#0f0f0f] p-6 border border-transparent motion-safe:transition-all motion-safe:duration-300 hover:motion-safe:-translate-y-1.5 hover:motion-safe:border-bs-cream/25 hover:motion-safe:shadow-[0_12px_40px_rgba(255,255,243,0.08)]"
          >
            <div className="w-32 h-32 mx-auto rounded-full bg-bs-cream/5 border border-bs-cream/10 flex items-center justify-center motion-safe:transition-transform motion-safe:duration-300 group-hover:motion-safe:rotate-2">
              <span className="font-brand text-2xl text-bs-cream/30">{dj.initials}</span>
            </div>
            <p className="font-brand text-lg text-bs-cream uppercase tracking-wider mt-4 text-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:delay-100 group-hover:motion-safe:translate-x-1">
              {dj.name}
            </p>
            <p className="text-xs text-bs-cream/60 text-center mt-1">{dj.genre}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
