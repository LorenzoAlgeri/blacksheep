"use client";

import { useState, useEffect } from "react";

const SECTION_IDS = [
  "hero",
  "next-event",
  "gallery",
  "dj-residents",
  "about",
  "location",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/**
 * Tracks which section is currently in view by finding the section
 * whose top edge is closest to 30% of the viewport height.
 * This is more reliable than IntersectionObserver for single-page nav.
 */
export function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>("hero");

  useEffect(() => {
    function onScroll() {
      const triggerLine = window.innerHeight * 0.3;
      let closest: SectionId = "hero";
      let closestDist = Infinity;

      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        // Find the section whose top is closest to (but above) the trigger line
        const dist = Math.abs(top - triggerLine);
        if (top <= triggerLine + 10 && dist < closestDist) {
          closestDist = dist;
          closest = id;
        }
      }

      // If we're near the bottom of the page, activate the last section
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
      if (atBottom) {
        closest = SECTION_IDS[SECTION_IDS.length - 1];
      }

      setActive(closest);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return active;
}
