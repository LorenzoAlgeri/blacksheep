"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, STAGGER, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
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

      gsap.from(cards, {
        ...ENTRANCE.card,
        duration: DURATION.major,
        ease: EASE.enter,
        stagger: STAGGER.normal,
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

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {DJS.map((dj, i) => (
          <div
            key={dj.name}
            ref={(el) => {
              if (el) cardsRef.current[i] = el;
            }}
            data-motion
            className="snap-start shrink-0 w-[280px] md:w-[320px] rounded-lg p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(190,131,5,0.3)]"
          >
            <div className="w-32 h-32 mx-auto rounded-full bg-bs-cream/5 border border-bs-cream/10 flex items-center justify-center">
              <span className="font-brand text-2xl text-bs-cream/20">{dj.initials}</span>
            </div>
            <p className="font-brand text-lg text-bs-cream uppercase tracking-wider mt-4 text-center">
              {dj.name}
            </p>
            <p className="text-xs text-bs-cream/40 text-center mt-1">{dj.genre}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
