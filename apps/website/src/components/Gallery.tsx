"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { EASE, DURATION, STAGGER, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { GalleryCard } from "@/components/ui/GalleryCard";

gsap.registerPlugin(ScrollTrigger);

/* ─── Gallery data ────────────────────────────────────────────────── */

const GALLERY_ITEMS = [
  { eventName: "BLACK SHEEP #47", eventDate: "7 Apr 2026" },
  { eventName: "BLACK SHEEP #46", eventDate: "31 Mar 2026" },
  { eventName: "BLACK SHEEP #45", eventDate: "24 Mar 2026" },
  { eventName: "BLACK SHEEP #44", eventDate: "17 Mar 2026" },
  { eventName: "BLACK SHEEP #43", eventDate: "10 Mar 2026" },
  { eventName: "BLACK SHEEP #42", eventDate: "3 Mar 2026" },
] as const;

/* ─── Component ───────────────────────────────────────────────────── */

export function Gallery() {
  const prefersReduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReduced || !gridRef.current) return;

      const cards = gridRef.current.querySelectorAll("[data-gallery-card]");
      if (cards.length === 0) return;

      gsap.from(cards, {
        ...ENTRANCE.card,
        duration: DURATION.standard,
        ease: EASE.enter,
        stagger: STAGGER.normal,
        scrollTrigger: {
          trigger: gridRef.current,
          ...SCROLL_TRIGGER_DEFAULTS,
        },
      });
    },
    { dependencies: [prefersReduced] },
  );

  return (
    <section id="gallery" className="section-padding bg-section-dark">
      <div className="mx-auto max-w-4xl">
        {/* Heading + divider */}
        <SectionHeading>GALLERY</SectionHeading>
        <GoldDivider className="my-8" />

        {/* Grid */}
        <div ref={gridRef} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GALLERY_ITEMS.map((item, i) => (
            <div key={item.eventName} data-gallery-card data-motion>
              <GalleryCard eventName={item.eventName} eventDate={item.eventDate} index={i} />
            </div>
          ))}
        </div>

        {/* Instagram link */}
        <div className="mt-10 text-center">
          <a
            href="https://www.instagram.com/blacksheep.community_"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-bs-cream/30 transition-colors hover:text-bs-cream/60"
          >
            SEGUICI SU INSTAGRAM
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
