/**
 * GSAP Animation Presets — BLACK SHEEP Website
 * Consistent easing, duration, and entrance configs across all sections.
 *
 * Easing rules:
 * - Entrances (scroll-triggered): "power3.out" — ALWAYS
 * - Hover effects: "power2.out" — fast in, smooth out
 * - Hover leave: "power2.inOut" — softer
 * - Spring/bounce (badges, CTAs): "back.out(1.4)"
 * - Parallax: "none" — linear, ALWAYS
 * - Exit/close (mobile menu, lightbox): "power2.in" — fast
 * - Cinematic (preloader, clip-path reveals): "power3.inOut"
 */

export const EASE = {
  enter: "power3.out",
  exit: "power2.in",
  move: "power2.inOut",
  spring: "back.out(1.4)",
  hover: "power2.out",
  cinematic: "power3.inOut",
  none: "none",
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

export const SCROLL_TRIGGER_DEFAULTS = {
  start: "top 80%",
  toggleActions: "play none none none" as const,
};

export const ENTRANCE = {
  heading: { y: 40, opacity: 0, filter: "blur(4px)" },
  text: { y: 20, opacity: 0 },
  card: { y: 30, opacity: 0 },
  divider: { scaleX: 0 },
  fromLeft: { x: -40, opacity: 0 },
  fromRight: { x: 40, opacity: 0 },
  fromRightWide: { x: 60, opacity: 0 },
  blurUp: { y: 15, opacity: 0, filter: "blur(2px)" },
  spring: { scale: 0.8, opacity: 0 },
} as const;
