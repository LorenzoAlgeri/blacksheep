/**
 * Motion design tokens — JS / GSAP companion to the `--bs-duration-*`
 * and `--bs-ease-*` CSS custom properties defined in
 * `apps/newsletter/src/app/globals.css`.
 *
 * GSAP timelines can't read CSS variables directly (durations are in
 * seconds, easings are named functions / require the CustomEase
 * plugin), so this module mirrors the brand pacing in numeric form
 * with the closest GSAP-built-in easing for each curve. Update both
 * surfaces in lockstep when the design system evolves.
 *
 * Usage:
 *
 *   import { MOTION } from "@/lib/motion-tokens";
 *
 *   gsap.to(target, {
 *     opacity: 1,
 *     duration: MOTION.duration.base,
 *     ease: MOTION.ease.out,
 *   });
 *
 *   tl.to(items, {
 *     y: 0,
 *     stagger: MOTION.stagger.base,
 *     duration: MOTION.duration.quick,
 *   });
 */
export const MOTION = {
  /** Durations in seconds, matching --bs-duration-* in globals.css.
   *  CSS values are in ms, here in s for GSAP convention. */
  duration: {
    instant: 0.1,
    quick: 0.2,
    base: 0.3,
    slow: 0.6,
    cinematic: 1.2,
  },
  /** GSAP easing names that approximate the cubic-bezier curves used
   *  by --bs-ease-* in globals.css. Approximations only — for exact
   *  parity with CSS, load the GSAP CustomEase plugin and define the
   *  cubic-beziers explicitly. */
  ease: {
    /** ≈ cubic-bezier(0.16, 1, 0.3, 1) — default brand deceleration. */
    out: "power3.out",
    /** ≈ cubic-bezier(0.22, 1, 0.36, 1) — softer than `out`. */
    soft: "power2.out",
    /** ≈ cubic-bezier(0.34, 1.4, 0.64, 1) — small overshoot for "pop". */
    spring: "back.out(1.4)",
    /** ≈ cubic-bezier(0.65, 0, 0.35, 1) — symmetric ease for toggles. */
    inOut: "power2.inOut",
  },
  /** Per-item stagger budgets in seconds. Match --bs-stagger-* in CSS. */
  stagger: {
    base: 0.08,
    tight: 0.06,
  },
} as const;
