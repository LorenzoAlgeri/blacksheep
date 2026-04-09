# BLACK SHEEP Website — Design Document

**Version**: v1
**Date**: 2026-04-09
**Status**: Draft — Pending Approval
**Author**: Claude + Lorenzo

## Context

BLACK SHEEP is a hip-hop/R&B club night every Monday at 11 Clubroom, Corso Como, Milano. 10K+ Instagram followers, Red Bull Turn It Up Milan 2025 winners. Target: 18-30, fashion-conscious, Milan scene + international expansion (London, Paris).

The newsletter landing exists (`apps/newsletter`) with a monochrome black/cream "Backstage Pass" aesthetic — minimal, single-viewport, mobile-only. The website must evolve this into a **richer, cinematic, Awwwards-level single-page experience** while maintaining brand coherence.

## Design Direction: "Chrome Noir Editorial"

The newsletter is a dark room with a single spotlight. The website is the full club — deep navy darkness, gold light cutting through smoke, movement everywhere but nothing frantic. An editorial magazine you scroll through, not a brochure.

### Key Differences from Newsletter

| Aspect      | Newsletter                      | Website                                     |
| ----------- | ------------------------------- | ------------------------------------------- |
| Background  | Pure black (#000000)            | Navy (#031240) — deeper, more color         |
| Width       | max-width 480px (mobile-only)   | Full viewport (375px → 1920px)              |
| Motion      | Minimal CSS + one GSAP entrance | Full GSAP scroll-triggered system           |
| Color range | Black + cream, gold barely used | Navy + cream + gold accents + burgundy CTAs |
| Content     | Single form                     | 7 sections, full brand story                |
| Mood        | Intimate whisper                | Cinematic experience                        |

---

## 1. Hero — "The Curtain Opens"

### Approach Chosen: SVG Path Draw + Staggered Reveal

**Sequence (2.5s total):**

1. **0.0s** — Page loads on solid navy. Nothing visible.
2. **0.3s** — BS Logo SVG paths begin drawing (stroke-dashoffset animation) in cream. Duration: 1.2s. The logo "writes itself" into existence.
3. **1.0s** — Once strokes are ~60% drawn, fill floods in (opacity 0 → 1, 0.4s)
4. **1.5s** — "BLACK SHEEP" appears: staggered per-letter, each letter y:30→0 + blur(4px)→0, stagger 0.04s
5. **2.0s** — "THE PLACE TO BE" fades in: y:15→0, opacity 0→1, tracking expands from 0.2em→0.4em
6. **2.5s** — Scroll indicator (thin cream line + chevron) breathes at bottom

**Why path draw, not clip-path?** The newsletter uses clip-path reveal — doing the same thing would feel derivative. SVG path draw is more technical, more premium, and the BS logo's complex curves make the tracing dramatic.

**Desktop enhancement:** Subtle parallax on logo (moves 10% slower than scroll). Not on mobile — saves GPU.

### Alternatives Considered

- **A: Scale zoom-in** — Logo starts huge and zoomed, camera "pulls back" to reveal. Rejected: too common, 3D-feeling doesn't match flat editorial aesthetic.
- **B: Horizontal curtain split** — Navy splits left/right like curtains, revealing content. Rejected: requires clip-path on body which is fragile, and the "theater" metaphor is too literal.

---

## 2. Narrative Flow — "A Night in Chapters"

The scroll tells the story of a night out, from anticipation to arrival:

```
HERO              → "We are BLACK SHEEP"          (Identity — who)
    ↓ gold divider
NEXT EVENT        → "This is what's next"         (Urgency — FOMO)
    ↓ gold divider
GALLERY           → "This is what you missed"     (Social proof — atmosphere)
    ↓ gold divider
DJ RESIDENTS      → "These are our people"        (Credibility — talent)
    ↓ gold divider
ABOUT             → "This is our story"           (Depth — brand story + Red Bull)
    ↓ gold divider
LOCATION          → "This is where it happens"    (Practical — directions)
    ↓ gold divider
CONTACT/BOOKING   → "Your move"                   (Conversion — action)
    ↓
FOOTER            → Social links + legal
```

### Section Backgrounds — Visual Rhythm

Alternating backgrounds prevent monotony while staying on-brand:

| Section      | Background                 | Reason                  |
| ------------ | -------------------------- | ----------------------- |
| Hero         | Navy (#031240) solid       | Clean entrance          |
| Next Event   | Navy → Black gradient      | Transition into urgency |
| Gallery      | Near-black (#0a0e1a)       | Photos pop on darker bg |
| DJ Residents | Navy (#031240)             | Return to brand color   |
| About        | Near-black (#0a0e1a)       | Contrast for stats      |
| Location     | Navy (#031240)             | Map needs lighter bg    |
| Contact      | Near-black → Navy gradient | Closing loop            |
| Footer       | Navy (#031240)             | Consistent with hero    |

### Section Headings — Consistent Treatment

Every section has a heading in Arial Black, uppercase, tracking 0.15em, cream. The heading is the first element to animate in (GSAP ScrollTrigger). Below it, a thin gold line (GoldDivider) scales from center.

---

## 3. Micro-interactions — "Not Just Another Club Site"

### Desktop Only

- **Cursor spotlight**: A 200px radial gradient (cream at 3% opacity) follows the cursor. Debounced to 60fps via requestAnimationFrame. Adds the "flashlight in a dark club" feeling without being gimmicky.
- **Magnetic CTA buttons**: Buttons shift 2-4px toward cursor when hovering within 80px radius. Uses GSAP quickTo for smooth physics.
- **DJ card hover**: Card lifts (translateY: -8px), gains gold border-glow (`box-shadow: 0 0 20px rgba(190,131,5,0.3)`), and the DJ photo zooms 1.05x.

### Mobile + Desktop

- **Animated counters**: Stats in ABOUT section (e.g., "150+ events", "10K+ followers") count up from 0 when scrolled into view. Duration: 1.5s, easing: power2.out.
- **Gallery card hover/tap**: Photo zooms 1.08x inside its container (overflow: hidden), dark overlay slides up from bottom with event name/date.
- **Scroll progress bar**: 2px gold line at the very top of viewport. Width tracks scroll position (0% → 100%). Always visible.
- **Section reveal**: Every section fades in as a unit when 20% visible. Elements within stagger.
- **Noise grain**: Consistent with newsletter — inline SVG noise, opacity 0.04 (lighter than newsletter's 0.06 since navy bg is already more textured than pure black).

### What We're NOT Doing

- No particle effects or WebGL — too heavy, not editorial
- No horizontal scroll sections — confusing on mobile, accessibility nightmare
- No auto-playing video backgrounds — bandwidth killer on mobile
- No parallax on mobile — GPU drain for minimal visual gain
- No custom cursor replacement — breaks accessibility, annoying on touchpad

---

## 4. Color Accent Strategy

### Gold (#BE8305) — "The Elegant Thread"

Used for decorative, non-interactive elements. It's the gold thread stitching the experience together.

| Where                | How                                                    |
| -------------------- | ------------------------------------------------------ |
| Section dividers     | GoldDivider component — thin line, scaleX animation    |
| Scroll progress bar  | 2px line at top of viewport                            |
| Stats numbers        | Counter digits in gold while counting, settle to cream |
| DJ card hover border | box-shadow: var(--bs-shadow-gold)                      |
| Red Bull badge       | Gold border/accent around the badge                    |
| "EVERY MONDAY" label | Gold at 50% opacity — subtle but warm                  |

### Burgundy (#731022) — "The Action Pulse"

Used exclusively for interactive elements that demand action.

| Where                    | How                                |
| ------------------------ | ---------------------------------- |
| CTA buttons background   | "PRENOTA TAVOLO", "SCOPRI DI PIU'" |
| Nav active indicator     | 2px underline on current section   |
| Countdown timer accent   | Seconds digit background           |
| WhatsApp deeplink button | Primary action in Contact section  |

### Rule: Gold and Burgundy Never Touch

They occupy different visual roles. If gold is within 24px of a burgundy element, one must yield (usually gold becomes cream/40).

---

## 5. Animation System — "The Rhythm"

### GSAP Configuration

**Global easing presets** (defined in `lib/animations.ts`):

```
EASE_ENTER    = "power3.out"      // Elements appearing
EASE_EXIT     = "power2.in"       // Elements disappearing
EASE_MOVE     = "power2.inOut"    // Elements repositioning
EASE_SPRING   = "back.out(1.4)"   // Playful overshoot (rare, DJ cards)
```

**Duration scale:**

| Category  | Duration | Use                             |
| --------- | -------- | ------------------------------- |
| Micro     | 0.2-0.3s | Hovers, focus states, toggles   |
| Standard  | 0.5-0.6s | Body text reveal, card entrance |
| Major     | 0.8-1.0s | Headings, images, hero elements |
| Cinematic | 1.2-1.5s | Hero logo draw, counters        |

**Stagger:** 0.08s between items in a list/grid. 0.12s between major section elements.

### ScrollTrigger Standard Pattern

Every section uses the same trigger configuration:

```
trigger: [section element]
start: "top 80%"          // fires when 20% of section visible
toggleActions: "play none none none"  // play once, never reverse
```

Elements within a section stagger in this order:

1. Section heading (0ms)
2. Gold divider (100ms)
3. Primary content (200ms)
4. Secondary content / cards (300ms, with inter-item stagger)

### prefers-reduced-motion Strategy

```
if (prefersReducedMotion) {
  // No GSAP timelines created at all
  // All elements visible by default (CSS: no opacity:0 initial state)
  // Lenis smooth scroll disabled (native scroll)
  // Cursor spotlight disabled
  // Only CSS transitions remain (hover color changes, 0ms duration)
}
```

Implementation: `useReducedMotion()` hook returns boolean. Every animation component checks this BEFORE registering GSAP animations. CSS uses `@media (prefers-reduced-motion: reduce)` to override `[data-motion]` states.

---

## 6. Gallery Placeholders

Until real photos arrive, use branded gradient cards:

**Card design:**

- Aspect ratio: 3:4 (portrait, matches Instagram source material)
- Background: linear-gradient(135deg, #031240, #0a0e1a) with noise overlay
- Centered: event number in Arial Black, cream/10, huge (120px) — like a watermark
- Bottom: date + event name in system font, cream/30
- Border: 1px cream/5

**Grid:**

- Mobile: 2 columns, 3 rows (6 cards)
- Tablet: 3 columns, 2 rows
- Desktop: 3 columns, 2 rows (wider cards)
- Gap: 8px (tight, magazine-style)

**Hover:** Card border transitions to cream/15. The watermark number subtly scales 1.02x.

**Future swap:** Each card is a `<GalleryCard>` component with `imageSrc?: string` prop. When `imageSrc` is provided, it renders an `<Image>` instead of the gradient. Zero refactoring needed.

---

## Section-by-Section Specs

### S1: Navbar (Sticky)

- Fixed at top, transparent initially, `bg-bs-navy/90 backdrop-blur-md` after scrolling past hero
- Left: BS logo icon (small, 32px)
- Right: Hamburger menu on mobile, section links on desktop
- Active section: burgundy underline indicator (tracks via IntersectionObserver)
- Height: 56px mobile, 64px desktop
- z-index: 50

### S2: Hero (100dvh)

See section 1 above. Full viewport height. No scroll snap.

### S3: Next Event

- Large date display: "LUNEDI 14 APRILE" in Arial Black
- Countdown: days/hours/minutes/seconds in a grid, each digit in its own box with burgundy accent
- DJ lineup: 2-3 names with role labels
- CTA: "PRENOTA TAVOLO" burgundy button → WhatsApp deeplink
- Note: Data hardcoded initially. Future: API or CMS.

### S4: Gallery

See section 6 above.

### S5: DJ Residents

- Horizontal scroll carousel (CSS scroll-snap on mobile, GSAP draggable on desktop)
- Each card: 280px wide, photo (square, placeholder circle with initials), DJ name in Arial Black, genre tags below
- Scroll indicators: dots or thin line showing position
- 4-6 DJ cards

### S6: About

- Two-column on desktop: text left, stats right. Stacked on mobile.
- Brand story: 2-3 paragraphs, system font, cream/80
- Red Bull badge: official logo/mark with gold border treatment
- Animated stats: "150+ EVENTS", "10K+ FOLLOWERS", "2 YEARS", "1 LOCATION" — counter animation

### S7: Location

- Dark-styled map embed (Mapbox GL or static image with link)
- Address: "11 Clubroom, Corso Como 11, Milano"
- Directions: metro stops, parking notes
- Opening hours

### S8: Contact / Booking

- Simple form: Name, Date, Number of people, Message (optional)
- Submit → WhatsApp deeplink with pre-filled message
- Alternative: direct WhatsApp button
- Note: No backend needed. Pure client-side URL construction.

### S9: Footer

- BS logo + social links (Instagram, TikTok, Facebook)
- Legal: Privacy Policy, Cookie Policy links
- Credits: "Designed in Milano"
- Compact, max 200px height

---

## Responsive Breakpoints

| Breakpoint | Viewport | Notes                                |
| ---------- | -------- | ------------------------------------ |
| Base       | 375px+   | Mobile-first, single column          |
| sm         | 640px+   | Gallery 2→3 columns                  |
| md         | 768px+   | Navbar expands, two-column layouts   |
| lg         | 1024px+  | Desktop cursor effects activate      |
| xl         | 1280px+  | Max content width (1200px), centered |
| 2xl        | 1536px+  | Wider spacing, larger type scale     |

Max content width: `max-w-7xl` (1280px) for text sections, full-bleed for gallery/hero.

---

## Performance Budget

| Metric             | Target                            |
| ------------------ | --------------------------------- |
| LCP                | < 2.5s                            |
| FID                | < 100ms                           |
| CLS                | < 0.1                             |
| Total JS           | < 150KB gzipped                   |
| GSAP + Lenis       | ~45KB gzipped (acceptable)        |
| Font (Arial Black) | ~50KB (local, no network request) |

**Strategy:**

- GSAP loaded dynamically only on first scroll event (or after 2s idle)
- Gallery images: lazy loaded with `loading="lazy"` + blur placeholder
- No 3D/WebGL
- All animations use `transform` + `opacity` only (GPU composited)
