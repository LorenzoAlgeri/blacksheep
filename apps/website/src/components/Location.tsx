"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Train, Car } from "lucide-react";
import { EASE, DURATION, STAGGER, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";

gsap.registerPlugin(ScrollTrigger);

const TRANSPORT = [
  { label: "METRO", detail: "Garibaldi (M2, M5)", Icon: Train },
  { label: "AUTO", detail: "Parcheggio Corso Como", Icon: Car },
] as const;

const MAPS_URL = "https://maps.google.com/?q=11+Clubroom+Corso+Como+11+Milano";

export function Location() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !containerRef.current) return;

      const items = containerRef.current.querySelectorAll("[data-animate='text']");
      if (items.length === 0) return;

      gsap.from(items, {
        ...ENTRANCE.text,
        duration: DURATION.standard,
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
    <section id="location" className="section-padding">
      <SectionHeading>DOVE SIAMO</SectionHeading>
      <GoldDivider className="my-8" />

      <div ref={containerRef} className="mx-auto max-w-2xl text-center">
        {/* Venue */}
        <p
          data-animate="text"
          data-motion
          className="font-brand text-xl tracking-wider text-bs-cream"
        >
          11 CLUBROOM
        </p>
        <p data-animate="text" data-motion className="mt-2 font-body text-bs-cream/60">
          Corso Como 11, 20154 Milano
        </p>

        {/* Divider */}
        <div className="mx-auto my-6 h-px w-12 bg-bs-cream/10" />

        {/* Transport grid */}
        <div
          data-animate="text"
          data-motion
          className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2"
        >
          {TRANSPORT.map(({ label, detail, Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon size={16} className="text-bs-cream/40" />
              <span className="font-brand text-xs uppercase tracking-widest text-bs-cream">
                {label}
              </span>
              <span className="text-sm text-bs-cream/60">{detail}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div data-animate="text" data-motion className="mt-10">
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border border-bs-cream/20 px-6 py-3 font-brand text-xs uppercase tracking-widest text-bs-cream transition-colors hover:bg-bs-cream/5"
          >
            APRI IN GOOGLE MAPS
          </a>
        </div>
      </div>
    </section>
  );
}
