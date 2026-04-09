# BLACK SHEEP Website — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cinematic single-page website for BLACK SHEEP with GSAP scroll-triggered animations, Lenis smooth scroll, and responsive design from 375px to 1920px.

**Architecture:** Next.js 16 App Router with client components for interactive sections. A shared animation system (`lib/animations.ts`) provides consistent GSAP presets. Each section is a standalone component with its own ScrollTrigger setup. Lenis wraps the entire page via a provider in layout.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, GSAP 3 + ScrollTrigger + @gsap/react, Lenis, Lucide React icons.

**Design Document:** `docs/plans/2026-04-09-website-design.md`

---

## File Map

```
apps/website/src/
├── app/
│   ├── layout.tsx              ← (exists) add LenisProvider
│   ├── globals.css             ← (exists) expand with animation states + section styles
│   └── page.tsx                ← (exists) rewrite as section orchestrator
├── components/
│   ├── Navbar.tsx              ← sticky nav with scroll-aware bg
│   ├── Hero.tsx                ← logo draw + text reveal
│   ├── NextEvent.tsx           ← countdown + lineup + CTA
│   ├── Gallery.tsx             ← photo grid with placeholders
│   ├── DJResidents.tsx         ← horizontal carousel
│   ├── About.tsx               ← brand story + stats
│   ├── Location.tsx            ← map + address
│   ├── Contact.tsx             ← form → WhatsApp deeplink
│   └── Footer.tsx              ← social + legal
├── components/ui/
│   ├── SectionHeading.tsx      ← reusable GSAP-animated heading
│   ├── GoldDivider.tsx         ← animated gold line between sections
│   ├── AnimatedCounter.tsx     ← number count-up on scroll
│   ├── ScrollProgress.tsx      ← gold bar at viewport top
│   ├── CursorGlow.tsx          ← desktop-only spotlight effect
│   └── GalleryCard.tsx         ← placeholder or image card
├── hooks/
│   ├── useLenis.ts             ← Lenis instance + scroll-to utility
│   ├── useReducedMotion.ts     ← prefers-reduced-motion boolean
│   └── useActiveSection.ts     ← IntersectionObserver for nav highlight
├── lib/
│   └── animations.ts           ← GSAP easing presets + reusable timeline factories
└── providers/
    └── LenisProvider.tsx       ← Lenis context + GSAP ScrollTrigger sync
```

## Dependency Graph

```
Task 1: Animation foundation (lib/ + hooks/ + providers/)
  ↓
Task 2: globals.css expansion + LenisProvider wiring in layout.tsx
  ↓
Task 3: UI primitives (SectionHeading, GoldDivider, ScrollProgress, CursorGlow)
  ↓ (Tasks 4-10 depend on 1-3 but are independent of each other)
  ├── Task 4:  Hero
  ├── Task 5:  Navbar
  ├── Task 6:  NextEvent + AnimatedCounter
  ├── Task 7:  Gallery + GalleryCard
  ├── Task 8:  DJResidents
  ├── Task 9:  About
  ├── Task 10: Location
  ├── Task 11: Contact
  └── Task 12: Footer
  ↓
Task 13: page.tsx orchestrator (assembles all sections)
  ↓
Task 14: Responsive polish + cross-browser QA
  ↓
Task 15: Performance audit + final verification
```

**Parallelizable:** Tasks 4-12 are fully independent. Ideal for subagent-driven development with 3-4 parallel agents.

---

## Complexity Estimates

| Task | Component                    | Complexity | Est. Lines | Notes                                                   |
| ---- | ---------------------------- | ---------- | ---------- | ------------------------------------------------------- |
| 1    | Animation foundation         | Medium     | ~120       | Core of everything                                      |
| 2    | globals.css + layout         | Low        | ~80        | Expanding existing files                                |
| 3    | UI primitives (4 components) | Medium     | ~200       | SectionHeading, GoldDivider, ScrollProgress, CursorGlow |
| 4    | Hero                         | High       | ~180       | SVG path draw + text stagger — most complex animation   |
| 5    | Navbar                       | Medium     | ~120       | Scroll detection + mobile menu                          |
| 6    | NextEvent                    | Medium     | ~150       | Countdown timer + layout                                |
| 7    | Gallery                      | Low-Med    | ~120       | Grid + placeholder cards                                |
| 8    | DJResidents                  | Medium     | ~150       | Carousel with scroll-snap                               |
| 9    | About                        | Medium     | ~130       | Stats counters + two-column                             |
| 10   | Location                     | Low        | ~80        | Static content + map link                               |
| 11   | Contact                      | Medium     | ~120       | Form + WhatsApp URL builder                             |
| 12   | Footer                       | Low        | ~60        | Static content                                          |
| 13   | page.tsx orchestrator        | Low        | ~50        | Import + arrange sections                               |
| 14   | Responsive polish            | Medium     | ~100       | Tweaks across all components                            |
| 15   | Performance + verify         | Low        | ~0         | Audit + fix                                             |

**Total estimate:** ~1,660 lines of new code

---

## Task 1: Animation Foundation

**Files:**

- Create: `src/lib/animations.ts`
- Create: `src/hooks/useReducedMotion.ts`
- Create: `src/hooks/useLenis.ts`
- Create: `src/hooks/useActiveSection.ts`
- Create: `src/providers/LenisProvider.tsx`

### Step 1: Create `useReducedMotion` hook

```typescript
// src/hooks/useReducedMotion.ts
"use client";
import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
```

### Step 2: Create animation presets

```typescript
// src/lib/animations.ts
export const EASE = {
  enter: "power3.out",
  exit: "power2.in",
  move: "power2.inOut",
  spring: "back.out(1.4)",
} as const;

export const DURATION = {
  micro: 0.25,
  standard: 0.6,
  major: 0.9,
  cinematic: 1.3,
} as const;

export const STAGGER = {
  tight: 0.06,
  normal: 0.1,
  wide: 0.15,
} as const;

// Standard ScrollTrigger config for sections
export const SCROLL_TRIGGER_DEFAULTS = {
  start: "top 80%",
  toggleActions: "play none none none" as const,
};

// Standard entrance animation values
export const ENTRANCE = {
  heading: { y: 40, opacity: 0, filter: "blur(4px)" },
  text: { y: 20, opacity: 0 },
  card: { y: 30, opacity: 0 },
  divider: { scaleX: 0 },
} as const;
```

### Step 3: Create LenisProvider

```typescript
// src/providers/LenisProvider.tsx
"use client";
import { ReactNode, useEffect, useRef } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => { lenis.destroy(); };
  }, [prefersReduced]);

  return <>{children}</>;
}
```

### Step 4: Create useActiveSection hook

```typescript
// src/hooks/useActiveSection.ts
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

export function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-40% 0px -60% 0px" },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return active;
}
```

### Step 5: Commit

```bash
git add src/lib/animations.ts src/hooks/ src/providers/
git commit -m "feat(website): add animation foundation — GSAP presets, Lenis provider, hooks"
```

---

## Task 2: Expand globals.css + Wire LenisProvider

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

### Step 1: Expand globals.css

Add to the existing file:

```css
/* === Animation initial states (prevents FOUC) === */
@media (prefers-reduced-motion: no-preference) {
  [data-motion] {
    opacity: 0;
  }
  [data-motion="draw"] {
    opacity: 1;
    stroke-dashoffset: var(--path-length, 1000);
  }
}

/* Fallback: if GSAP doesn't run within 4s, make everything visible */
@keyframes motion-fallback {
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: no-preference) {
  [data-motion] {
    animation: motion-fallback 0s 4s forwards;
  }
}

/* === Noise grain overlay (lighter than newsletter: 0.04) === */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.04;
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 50;
}

/* === Section spacing === */
.section-padding {
  padding-top: clamp(4rem, 10dvh, 8rem);
  padding-bottom: clamp(4rem, 10dvh, 8rem);
  padding-left: clamp(1rem, 5vw, 2rem);
  padding-right: clamp(1rem, 5vw, 2rem);
}

/* === Alternating section backgrounds === */
.bg-section-dark {
  background: #0a0e1a;
}

/* === Autofill override (same as newsletter) === */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px var(--bs-navy) inset !important;
  -webkit-text-fill-color: var(--bs-cream) !important;
  background-color: transparent !important;
  transition: background-color 5000s ease-in-out 0s;
  caret-color: var(--bs-cream);
}
```

### Step 2: Wire LenisProvider in layout.tsx

```tsx
import { LenisProvider } from "@/providers/LenisProvider";

// In the return:
<body className="min-h-dvh flex flex-col">
  <LenisProvider>{children}</LenisProvider>
</body>;
```

### Step 3: Commit

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(website): expand globals.css with animation states + wire LenisProvider"
```

---

## Task 3: UI Primitives

**Files:**

- Create: `src/components/ui/SectionHeading.tsx`
- Create: `src/components/ui/GoldDivider.tsx`
- Create: `src/components/ui/ScrollProgress.tsx`
- Create: `src/components/ui/CursorGlow.tsx`

### Step 1: SectionHeading

Reusable section title with GSAP scroll-triggered entrance.

```tsx
// src/components/ui/SectionHeading.tsx
"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, SCROLL_TRIGGER_DEFAULTS, ENTRANCE } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeading({ children, className = "" }: SectionHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !ref.current) return;
      gsap.from(ref.current, {
        ...ENTRANCE.heading,
        duration: DURATION.major,
        ease: EASE.enter,
        scrollTrigger: { trigger: ref.current, ...SCROLL_TRIGGER_DEFAULTS },
      });
    },
    { dependencies: [prefersReduced] },
  );

  return (
    <h2
      ref={ref}
      data-motion
      className={`font-brand text-bs-cream uppercase tracking-[0.15em] text-center
        text-2xl sm:text-3xl md:text-4xl ${className}`}
    >
      {children}
    </h2>
  );
}
```

### Step 2: GoldDivider

```tsx
// src/components/ui/GoldDivider.tsx
"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, DURATION, SCROLL_TRIGGER_DEFAULTS } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export function GoldDivider({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !ref.current) return;
      gsap.from(ref.current, {
        scaleX: 0,
        duration: DURATION.standard,
        ease: EASE.enter,
        scrollTrigger: { trigger: ref.current, ...SCROLL_TRIGGER_DEFAULTS },
      });
    },
    { dependencies: [prefersReduced] },
  );

  return (
    <div
      ref={ref}
      data-motion
      className={`h-px w-24 mx-auto bg-gradient-to-r from-transparent via-bs-gold/40 to-transparent ${className}`}
    />
  );
}
```

### Step 3: ScrollProgress

```tsx
// src/components/ui/ScrollProgress.tsx
"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [prefersReduced]);

  if (prefersReduced) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60]">
      <div className="h-full bg-bs-gold transition-none" style={{ width: `${progress}%` }} />
    </div>
  );
}
```

### Step 4: CursorGlow (desktop only)

```tsx
// src/components/ui/CursorGlow.tsx
"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;
    // Only on desktop (pointer: fine)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    let rafId: number;
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (el) {
          el.style.left = `${e.clientX}px`;
          el.style.top = `${e.clientY}px`;
          el.style.opacity = "1";
        }
      });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReduced]);

  if (prefersReduced) return null;

  return (
    <div
      ref={ref}
      className="fixed w-[200px] h-[200px] rounded-full pointer-events-none z-[45] opacity-0 transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2"
      style={{
        background: "radial-gradient(circle, rgba(255,255,243,0.03) 0%, transparent 70%)",
      }}
    />
  );
}
```

### Step 5: Commit

```bash
git add src/components/ui/
git commit -m "feat(website): add UI primitives — SectionHeading, GoldDivider, ScrollProgress, CursorGlow"
```

---

## Task 4: Hero Section

**Files:**

- Create: `src/components/Hero.tsx`

**Complexity: HIGH** — SVG path draw animation + staggered text.

### Step 1: Create Hero component

The hero contains:

1. BS Logo with SVG stroke draw animation
2. "BLACK SHEEP" staggered letter reveal
3. "THE PLACE TO BE" fade-in with tracking expansion
4. Scroll indicator at bottom

Key implementation detail: SVG path draw requires calculating `getTotalLength()` on each path element, then animating `stroke-dashoffset` from that length to 0. Fill fades in separately.

```tsx
// src/components/Hero.tsx
"use client";

// Uses: useGSAP, gsap, ScrollTrigger (for later sections), useReducedMotion
// Logo paths: use the two <path> elements from BSLogo in packages/shared
// Split "BLACK SHEEP" into individual <span> elements for per-letter stagger
// "THE PLACE TO BE" separate element with tracking animation
// Scroll indicator: animated chevron or line at bottom

// Animation timeline (useGSAP):
// 1. Logo stroke draw: strokeDashoffset from pathLength to 0 (1.2s, EASE.enter)
// 2. Logo fill: opacity 0→1 (0.4s, starts at 60% of stroke draw)
// 3. Title letters: y:30→0, blur(4px)→0, stagger 0.04s per letter
// 4. Subtitle: y:15→0, letterSpacing from 0.2em→0.4em
// 5. Scroll indicator: opacity 0→1, y bounce loop
```

Exact code to be written during execution — the hero is the most complex component and should be built iteratively with visual testing.

**Docs to check:** `@gsap/react` useGSAP hook API, SVG stroke-dasharray technique.

### Step 2: Commit

```bash
git add src/components/Hero.tsx
git commit -m "feat(website): add Hero section with SVG path draw animation"
```

---

## Task 5: Navbar

**Files:**

- Create: `src/components/Navbar.tsx`

### Implementation Notes

- Tracks scroll position to toggle transparent→solid background
- Uses `useActiveSection()` hook for section highlight
- Mobile: hamburger → slide-in menu (right side)
- Desktop: horizontal links
- Clicking a link → smooth scroll via Lenis `scrollTo()`
- Logo click → scroll to top

### Commit

```bash
git add src/components/Navbar.tsx
git commit -m "feat(website): add sticky Navbar with scroll-aware background and mobile menu"
```

---

## Task 6: NextEvent + AnimatedCounter

**Files:**

- Create: `src/components/NextEvent.tsx`
- Create: `src/components/ui/AnimatedCounter.tsx`

### AnimatedCounter Implementation

```tsx
// src/components/ui/AnimatedCounter.tsx
// Props: end: number, duration?: number, suffix?: string, prefix?: string
// Uses: useGSAP + ScrollTrigger to trigger count-up when visible
// Approach: gsap.to a proxy object { value: 0 } → { value: end }
//           update text content in onUpdate callback
// prefers-reduced-motion: just show the final number
```

### NextEvent Implementation

- Countdown uses `useState` + `useEffect` interval (1s tick)
- Target date hardcoded initially as const
- Sections: date banner, countdown grid, DJ lineup list, CTA button
- CTA → `https://wa.me/39XXXXXXXXXX?text=...` deeplink

### Commit

```bash
git add src/components/NextEvent.tsx src/components/ui/AnimatedCounter.tsx
git commit -m "feat(website): add NextEvent section with countdown and AnimatedCounter"
```

---

## Task 7: Gallery + GalleryCard

**Files:**

- Create: `src/components/Gallery.tsx`
- Create: `src/components/ui/GalleryCard.tsx`

### GalleryCard Implementation

```tsx
// src/components/ui/GalleryCard.tsx
// Props: imageSrc?: string, eventName: string, eventDate: string, index: number
// If imageSrc: render <Image> with hover zoom + overlay
// If no imageSrc: gradient placeholder with watermark number
// Aspect ratio: 3:4 via aspect-[3/4]
```

### Gallery Grid

- CSS Grid: `grid-cols-2 sm:grid-cols-3`
- Gap: `gap-2`
- 6 placeholder cards
- GSAP stagger entrance on scroll

### Commit

```bash
git add src/components/Gallery.tsx src/components/ui/GalleryCard.tsx
git commit -m "feat(website): add Gallery section with placeholder cards"
```

---

## Task 8: DJResidents

**Files:**

- Create: `src/components/DJResidents.tsx`

### Implementation Notes

- Horizontal scroll container: `overflow-x-auto snap-x snap-mandatory`
- Each card: `snap-start`, fixed width (280px)
- Card content: circular photo placeholder (initials), name, genre tags
- Desktop: wider cards (320px), hover lift + gold glow
- Hide scrollbar: `scrollbar-hide` utility or CSS
- Scroll indicators: optional dots below

### Commit

```bash
git add src/components/DJResidents.tsx
git commit -m "feat(website): add DJResidents horizontal carousel"
```

---

## Task 9: About

**Files:**

- Create: `src/components/About.tsx`

### Implementation Notes

- Two-column on md+: text (left col), stats grid (right col)
- Text: 2-3 paragraphs about BLACK SHEEP story
- Stats: 4x AnimatedCounter in a 2x2 grid
- Red Bull badge: placeholder with gold border, text "Red Bull Turn It Up 2025 Winners"
- All content in Italian

### Commit

```bash
git add src/components/About.tsx
git commit -m "feat(website): add About section with animated stats and brand story"
```

---

## Task 10: Location

**Files:**

- Create: `src/components/Location.tsx`

### Implementation Notes

- Simple layout: heading + address + map link
- Map: static dark image or link to Google Maps (no embed — performance)
- Address: "11 Clubroom, Corso Como 11, 20154 Milano"
- Transport info: Metro Garibaldi (M2/M5), parking notes
- CTA: "APRI IN GOOGLE MAPS" → external link

### Commit

```bash
git add src/components/Location.tsx
git commit -m "feat(website): add Location section with address and map link"
```

---

## Task 11: Contact / Booking

**Files:**

- Create: `src/components/Contact.tsx`

### Implementation Notes

- Form fields: name (required), date (required), guests (required), message (optional)
- Submit builds WhatsApp deeplink: `https://wa.me/39XXXXXXXXXX?text=...`
- URL-encode the message with all form data
- Validation: client-side only, basic HTML5 + visual feedback
- Alternative: direct "SCRIVI SU WHATSAPP" button below form
- No backend needed

### Commit

```bash
git add src/components/Contact.tsx
git commit -m "feat(website): add Contact section with WhatsApp booking form"
```

---

## Task 12: Footer

**Files:**

- Create: `src/components/Footer.tsx`

### Implementation Notes

- BS logo (small), social links (Instagram, TikTok, Facebook) using Lucide icons
- Legal links: Privacy Policy, Cookie Policy (placeholder hrefs)
- Credit line: "BLACK SHEEP © 2026 — Designed in Milano"
- Compact: py-12, border-t border-cream/5

### Commit

```bash
git add src/components/Footer.tsx
git commit -m "feat(website): add Footer with social links"
```

---

## Task 13: Page Orchestrator

**Files:**

- Modify: `src/app/page.tsx`

### Step 1: Assemble all sections

```tsx
// src/app/page.tsx
import { Navbar } from "@/components/Navbar";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CursorGlow } from "@/components/ui/CursorGlow";
import { Hero } from "@/components/Hero";
import { NextEvent } from "@/components/NextEvent";
import { Gallery } from "@/components/Gallery";
import { DJResidents } from "@/components/DJResidents";
import { About } from "@/components/About";
import { Location } from "@/components/Location";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <Hero />
      <NextEvent />
      <Gallery />
      <DJResidents />
      <About />
      <Location />
      <Contact />
      <Footer />
    </>
  );
}
```

### Step 2: Commit

```bash
git add src/app/page.tsx
git commit -m "feat(website): assemble all sections in page orchestrator"
```

---

## Task 14: Responsive Polish

**Files:**

- Modify: multiple components as needed

### Checklist

- [ ] Hero text sizes: clamp(2.5rem, 8vw, 5rem) for title
- [ ] Navbar: hamburger < md, expanded >= md
- [ ] Gallery: 2 cols → 3 cols at sm
- [ ] DJ carousel: snap behavior smooth on iOS Safari
- [ ] About: stacked on mobile, side-by-side on md+
- [ ] Contact form: full width on mobile, max-w-md on desktop
- [ ] All section padding: consistent `section-padding` class
- [ ] Test at: 375px, 640px, 768px, 1024px, 1280px, 1920px
- [ ] Touch targets: all buttons minimum 44x44px
- [ ] No horizontal overflow on any breakpoint

### Commit

```bash
git commit -m "fix(website): responsive polish across all breakpoints"
```

---

## Task 15: Performance Audit + Final Verification

### Step 1: Build check

```bash
npm run build --workspace=apps/website
npx tsc --noEmit --project apps/website/tsconfig.json
npm run lint --workspace=apps/website
```

All must pass with zero errors/warnings.

### Step 2: Performance check

- [ ] Run Lighthouse in Chrome DevTools (mobile profile)
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Total JS bundle < 150KB gzipped
- [ ] All images lazy loaded
- [ ] GSAP only loaded on client

### Step 3: Accessibility check

- [ ] Tab through entire page — all interactive elements reachable
- [ ] Toggle prefers-reduced-motion — all animations disabled, all content visible
- [ ] Screen reader: all headings, landmarks, alt text present
- [ ] Color contrast: cream on navy passes WCAG AA (contrast ratio 14.5:1 — passes)

### Step 4: Cross-browser

- [ ] Chrome, Firefox, Safari (desktop)
- [ ] iOS Safari, Chrome Android (mobile)
- [ ] Lenis smooth scroll works on all

### Step 5: Final commit

```bash
npm run build
git add -A
git commit -m "chore(website): performance and accessibility audit pass"
```

---

## Subagent Parallelization Strategy

**Wave 1 (sequential, must be first):**

- Task 1: Animation foundation
- Task 2: globals.css + layout
- Task 3: UI primitives

**Wave 2 (parallel — 4 subagents):**

- Agent A: Task 4 (Hero) + Task 5 (Navbar)
- Agent B: Task 6 (NextEvent) + Task 7 (Gallery)
- Agent C: Task 8 (DJResidents) + Task 9 (About)
- Agent D: Task 10 (Location) + Task 11 (Contact) + Task 12 (Footer)

**Wave 3 (sequential, after merge):**

- Task 13: Page orchestrator
- Task 14: Responsive polish
- Task 15: Final verification

**Estimated execution:** Wave 1 (~15 min) → Wave 2 (~20 min parallel) → Wave 3 (~15 min) = ~50 min total.

---

## Skills Reference

During implementation, consult these skills:

| Task              | Skills to read                                      |
| ----------------- | --------------------------------------------------- |
| GSAP animations   | `interaction-design`, `react-patterns`              |
| Tailwind styling  | `tailwind-css-patterns`, `tailwind-design-system`   |
| Responsive layout | `responsive-design`                                 |
| Next.js patterns  | `nextjs-app-router-patterns`                        |
| Accessibility     | `accessibility-compliance`, `wcag-audit-patterns`   |
| Component design  | `vercel-composition-patterns`, `shadcn-ui`          |
| Performance       | `nextjs-performance`, `vercel-react-best-practices` |
