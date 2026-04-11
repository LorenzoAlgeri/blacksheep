"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { useActiveSection } from "@/hooks/useActiveSection";
import type { SectionId } from "@/hooks/useActiveSection";

const NAV_LINKS: { label: string; sectionId: SectionId }[] = [
  { label: "PROSSIMO", sectionId: "next-event" },
  { label: "GALLERY", sectionId: "gallery" },
  { label: "DJ", sectionId: "dj-residents" },
  { label: "ABOUT", sectionId: "about" },
  { label: "DOVE SIAMO", sectionId: "location" },
  { label: "CONTATTI", sectionId: "contact" },
];

function scrollToSection(id: string) {
  if (id === "hero") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useActiveSection();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > window.innerHeight * 0.8);
    }
    // Check initial state
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const handleNavClick = useCallback((sectionId: string) => {
    scrollToSection(sectionId);
    setMobileOpen(false);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center px-4 md:px-6 motion-safe:transition-colors motion-safe:duration-300 ${
          scrolled ? "bg-black/90 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        {/* Left — Logo */}
        <button
          onClick={() => scrollToSection("hero")}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-sm"
          aria-label="Black Sheep — Home"
        >
          <svg
            viewBox="0 0 1389.1 879.04"
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-auto"
            aria-hidden="true"
            fill="var(--bs-cream)"
          >
            <path d="M1033.1,0l31.36,3.14c160.09,20.33,291.17,145.92,319.33,304.33l5.31,38.14v22.97c-2.17,11.15-5.26,21.69-10.83,31.64-4.97,8.88-11.57,16.11-19.43,22.55-28.54,4.39-58.71,4.43-87.1,8.89-11.89,1.87-31.82,8.89-7.86,14.56,27.61,6.54,62.1,4.8,90.61,9.38,6.63,1.07,11.36,6.39,15.58,11.41,10.59,12.57,15.86,27.44,19.03,43.42v22.97l-3.17,25.31c-25.4,176.17-174.06,311.64-352.29,320.34H356.56C177.79,870.83,25.91,732.23,3.24,554.73l-3.14-31.32v-17.98l98.01-1c-.04,61.86,20.52,122.28,58.6,170.71,49.55,63.01,124.22,101.93,204.86,106.02h666.09c52.84-2.86,103.65-19.8,146.77-50.17,64.31-45.3,108.29-118.72,115.61-197.52l-115.72-34.74c-59.75-23.78-58.3-97.92,4.02-119.42,36.67-12.65,74.8-21.77,111.69-33.77-8.09-84.48-57.21-161.61-129.01-206.11-41.33-25.62-87.59-39.23-136.37-41.58H365.56c-49.39,2.23-96.7,16.29-138.37,42.58-79.61,50.22-129.66,139.32-129.08,234.15H.1c.22-6.3-.31-12.7,0-18.98C9.42,164.14,165.64,9.1,357.1,0h676Z" />
            <path d="M257.74,544.74c3.72,3.85,6.11,11.86,9.54,16.94,33.08,48.88,144.91,68.45,200.27,70.65,107,4.25,216.8-3.32,324.09,0,37.57-2.84,75.15-7.77,111.23-18.75,30.68-9.34,83.68-31.53,94.29-64.64,2.66-8.3,3.34-44.89,1.51-53.55-2.02-9.49-13.12-15.49-22.05-16.93l-748.05.05c-11.05-.5-22.63-5.48-26.77-16.21.76-30.71-3.38-65.81-.67-96.19,4.5-50.41,68.58-86.42,110.74-102.15,141.82-52.9,312.76-21.31,461.79-30.26,75.72-.97,248.35,30.55,277.65,112.23,9.39,26.18-28.74,36.92-47.12,24.1-7.55-5.27-8.75-13.15-13.66-20.32-29.26-42.77-120.2-62.74-169.03-67.89-109.69-11.58-228.21,2.26-338.93-3.16-48.74,2.45-98.03,8.12-143.97,25-27.02,9.93-76.24,33.91-79.47,66.45-.84,8.47-1.32,39.26.22,46.71,1.96,9.48,15.4,16.07,24.29,16.69l747.03-.03c11.83.6,25.29,7.7,26.5,20.48-3.71,38.2,9.03,87.1-10.62,121.32-41.65,72.54-177.82,99.09-254.88,102.01h-326.08c-74.34-2.92-192.08-26.5-242.43-85.47-5.35-6.27-15.94-21.61-17.58-29.38-5.47-25.86,36.61-33.83,52.2-17.68Z" />
          </svg>
        </button>

        {/* Right — Desktop nav links */}
        <nav
          className="ml-auto hidden md:flex items-center gap-6"
          aria-label="Navigazione principale"
        >
          {NAV_LINKS.map(({ label, sectionId }) => (
            <button
              key={sectionId}
              onClick={() => handleNavClick(sectionId)}
              className={`relative font-brand text-xs uppercase text-bs-cream/80 hover:text-bs-cream motion-safe:transition-all motion-safe:duration-200 pb-1 rounded-sm ${
                activeSection === sectionId
                  ? "text-bs-cream tracking-[0.08em]"
                  : "tracking-[0.05em] hover:tracking-[0.08em]"
              }`}
            >
              {label}
              {/* Active underline indicator */}
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-bs-cream motion-safe:transition-all motion-safe:duration-300 origin-left ${
                  activeSection === sectionId
                    ? "scale-x-100 shadow-[0_2px_8px_rgba(255,255,243,0.15)]"
                    : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </nav>

        {/* Right — Mobile hamburger (44px min touch target) */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="ml-auto md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-bs-cream rounded-sm"
          aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile fullscreen menu */}
      <div
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? "Menu di navigazione" : undefined}
        className={`fixed inset-0 z-[55] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center motion-safe:transition-opacity motion-safe:duration-300 md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Close button top-right */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-bs-cream rounded-sm"
          aria-label="Chiudi menu"
          tabIndex={mobileOpen ? 0 : -1}
        >
          <X size={24} />
        </button>

        <nav className="flex flex-col items-center gap-8" aria-label="Menu mobile">
          {NAV_LINKS.map(({ label, sectionId }) => (
            <button
              key={sectionId}
              onClick={() => handleNavClick(sectionId)}
              tabIndex={mobileOpen ? 0 : -1}
              className={`font-brand text-lg tracking-widest uppercase text-center min-h-[44px] min-w-[44px] flex items-center justify-center motion-safe:transition-colors motion-safe:duration-200 rounded-sm ${
                activeSection === sectionId
                  ? "text-bs-cream"
                  : "text-bs-cream/60 hover:text-bs-cream"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA in mobile menu */}
        <button
          onClick={() => handleNavClick("contact")}
          tabIndex={mobileOpen ? 0 : -1}
          className="mt-10 bg-bs-cream px-8 py-4 font-brand text-sm uppercase tracking-widest text-black min-h-[48px]"
        >
          PRENOTA
        </button>
      </div>
    </>
  );
}
