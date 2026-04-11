"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { EASE, DURATION, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { GalleryCard } from "@/components/ui/GalleryCard";

gsap.registerPlugin(ScrollTrigger);

/* ─── Gallery data ────────────────────────────────────────────────── */

const GALLERY_ITEMS = [
  { eventName: "BLACK SHEEP #47", eventDate: "7 Apr 2026", genre: "Afro Night" },
  { eventName: "BLACK SHEEP #46", eventDate: "31 Mar 2026", genre: "Hip-Hop Classics" },
  { eventName: "BLACK SHEEP #45", eventDate: "24 Mar 2026", genre: "R&B Vibes" },
  { eventName: "BLACK SHEEP #44", eventDate: "17 Mar 2026", genre: "Amapiano Session" },
  { eventName: "BLACK SHEEP #43", eventDate: "10 Mar 2026", genre: "Trap & Drill" },
  { eventName: "BLACK SHEEP #42", eventDate: "3 Mar 2026", genre: "Latin Fusion" },
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

      // Grid stagger — wave effect from top-left
      gsap.from(cards, {
        ...ENTRANCE.card,
        duration: DURATION.major,
        ease: EASE.enter,
        stagger: {
          grid: [2, 3],
          from: "start",
          amount: 0.4,
        },
        scrollTrigger: {
          trigger: gridRef.current,
          ...SCROLL_TRIGGER_DEFAULTS,
        },
      });

      // Parallax on gallery card inner content (desktop only)
      const isDesktop = window.matchMedia("(pointer: fine)").matches;
      if (isDesktop) {
        const inners = gridRef.current.querySelectorAll("[data-gallery-inner]");
        inners.forEach((inner) => {
          gsap.to(inner, {
            yPercent: -10,
            ease: "none",
            scrollTrigger: {
              trigger: inner.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });
      }
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
        <div ref={gridRef} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_ITEMS.map((item, i) => (
            <div key={item.eventName} data-gallery-card data-motion>
              <GalleryCard
                eventName={item.eventName}
                eventDate={item.eventDate}
                genre={item.genre}
                index={i}
              />
            </div>
          ))}
        </div>

        {/* Instagram link */}
        <div className="mt-10 text-center">
          <a
            href="https://www.instagram.com/blacksheep.community_"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-bs-cream/50 motion-safe:transition-colors hover:text-bs-cream/70 min-h-[44px] px-3"
          >
            SEGUICI SU INSTAGRAM
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
