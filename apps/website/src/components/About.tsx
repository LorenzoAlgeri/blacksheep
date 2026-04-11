"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, STAGGER, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

gsap.registerPlugin(ScrollTrigger);

interface Stat {
  end: number;
  suffix: string;
  label: string;
}

const STATS: Stat[] = [
  { end: 2019, suffix: "", label: "ANNO DI NASCITA" },
  { end: 11, suffix: "K+", label: "COMMUNITY" },
  { end: 50, suffix: "+", label: "DJ OSPITI" },
  { end: 1, suffix: "", label: "RED BULL WINNER" },
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !sectionRef.current) return;

      // Left column — enters from left
      if (leftColRef.current) {
        const paragraphs = leftColRef.current.querySelectorAll("[data-motion]");
        gsap.from(paragraphs, {
          ...ENTRANCE.fromLeft,
          duration: DURATION.major,
          ease: EASE.enter,
          stagger: STAGGER.normal,
          scrollTrigger: {
            trigger: leftColRef.current,
            ...SCROLL_TRIGGER_DEFAULTS,
          },
        });
      }

      // Right column — stat cards enter from right, badge enters with spring
      if (rightColRef.current) {
        const statCards = rightColRef.current.querySelectorAll("[data-animate='stat']");
        const badge = rightColRef.current.querySelector("[data-animate='badge']");

        if (statCards.length > 0) {
          gsap.from(statCards, {
            ...ENTRANCE.fromRight,
            duration: DURATION.major,
            ease: EASE.enter,
            stagger: STAGGER.normal,
            delay: 0.3,
            scrollTrigger: {
              trigger: rightColRef.current,
              ...SCROLL_TRIGGER_DEFAULTS,
            },
          });
        }

        if (badge) {
          gsap.from(badge, {
            ...ENTRANCE.spring,
            duration: DURATION.major,
            ease: EASE.spring,
            delay: 0.6,
            scrollTrigger: {
              trigger: rightColRef.current,
              ...SCROLL_TRIGGER_DEFAULTS,
            },
          });
        }
      }
    },
    { dependencies: [prefersReduced] },
  );

  return (
    <section id="about" className="section-padding bg-section-dark" ref={sectionRef}>
      <SectionHeading>CHI SIAMO</SectionHeading>
      <GoldDivider className="mt-4 mb-10" />

      <div className="grid md:grid-cols-2 gap-12 md:gap-16 max-w-5xl mx-auto">
        {/* Left column — brand story */}
        <div ref={leftColRef}>
          <p data-motion className="font-body text-bs-cream/70 text-base leading-relaxed">
            BLACK SHEEP nasce nel 2019 da due ragazzi di seconda generazione con un&apos;idea
            semplice: dare spazio e visibilità a chi si sente diverso. La pecora nera che non sta
            nel gregge.
          </p>
          <p data-motion className="font-body text-bs-cream/70 text-base leading-relaxed mt-6">
            Ogni lunedì al 11 Clubroom, Corso Como — Milano diventa casa nostra. Hip-Hop, R&amp;B,
            Afrobeats, Amapiano, Dembow, Brazilian Funk, Arabic. Non un genere, una cultura.
          </p>
          <p data-motion className="font-body text-bs-cream/70 text-base leading-relaxed mt-6">
            Dal 2019 siamo cresciuti da serata underground a community. Nel 2025 abbiamo vinto il
            Red Bull Turn It Up Milano, portando le nostre vibes anche a Londra, all&apos;Oslo
            Hackney.
          </p>
          <p data-motion className="font-body text-bs-cream/70 text-base leading-relaxed mt-6">
            Attraverso musica, danza, moda e cultura, Black Sheep è il posto dove essere te stesso
            non è un&apos;opzione — è l&apos;unica regola.
          </p>
        </div>

        {/* Right column — stats + badge */}
        <div ref={rightColRef}>
          <div className="grid grid-cols-2 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} data-motion data-animate="stat" className="text-center">
                <AnimatedCounter
                  end={stat.end}
                  suffix={stat.suffix}
                  className="font-brand text-3xl md:text-4xl text-bs-cream"
                />
                <p className="text-xs uppercase tracking-widest text-bs-cream/60 mt-2">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div
            data-motion
            data-animate="badge"
            className="border border-bs-cream/10 rounded-sm px-4 py-3 text-center mt-8"
          >
            <p className="font-brand text-xs tracking-widest text-bs-cream">
              RED BULL TURN IT UP 2025
            </p>
            <p className="text-[10px] text-bs-cream/50 mt-1">MILAN WINNERS</p>
          </div>
        </div>
      </div>
    </section>
  );
}
