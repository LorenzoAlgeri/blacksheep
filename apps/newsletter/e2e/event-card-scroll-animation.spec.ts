import { test, expect } from "@playwright/test";
import { gotoNewsletterHome } from "./helpers";

/**
 * EventCard scroll-driven entrance — regression spec for Track B v2 bug #1.
 *
 * Background: the original implementation attempted
 * `animation-timeline: view()` (Tier 1) with an IntersectionObserver
 * fallback (Tier 2). Tier 1 proved unreliable on first-load downward
 * scroll — `animation-range: cover N%` left cards stuck in their
 * before-range state until the user hard-refreshed past the start of
 * the range. The runtime now opts into Tier 2 unconditionally by
 * shipping `data-fallback="true"` on every card and gating the
 * entrance CSS on `data-ready="true"`.
 *
 * This spec locks down that contract so a future "let's try
 * scroll-timeline again" change cannot silently re-introduce the bug:
 *
 *  - data-fallback stays "true" (we don't accidentally flip back to
 *    Tier 1 / native scroll-timeline)
 *  - data-ready flips to "true" post-hydration (no-JS users still see
 *    the cards in their natural visible state)
 *  - data-animated flips to "true" once the card is in viewport (IO
 *    is firing as expected)
 *
 * Important: the spec runs with `prefers-reduced-motion: no-preference`
 * to actually exercise the IO branch. The global playwright config
 * forces `reduce`, which would short-circuit the EventCard effect into
 * marking the card animated immediately — trivially passing the
 * data-animated assertion without proving anything about IO.
 */
test.describe("EventCard scroll-driven entrance — IO path", () => {
  test("visible cards animate via IntersectionObserver after hydration", async ({ page }) => {
    // Override the global reducedMotion=reduce setting so the EventCard
    // effect goes through the actual IO branch instead of the
    // immediate-animated short-circuit.
    await page.emulateMedia({ reducedMotion: "no-preference" });

    // Lock the viewport — the IO threshold (0.15) and rootMargin
    // ("0px 0px -10% 0px") interact with layout, so a stable viewport
    // keeps the spec deterministic regardless of the runner's default.
    await page.setViewportSize({ width: 1280, height: 800 });

    await gotoNewsletterHome(page);

    const firstCard = page.locator("article[data-bs-card]").first();
    await firstCard.waitFor({ state: "attached", timeout: 15_000 });

    // Architecture regression: the IO path stays the active one. If
    // someone re-enables Tier 1 scroll-timeline by flipping this flag,
    // they have to either prove view() works reliably or update this
    // spec.
    await expect(firstCard).toHaveAttribute("data-fallback", "true");

    // Hydration: data-ready arms the entrance CSS rules. Without it,
    // no-JS visitors would be stuck looking at an opacity:0 card.
    await expect(firstCard).toHaveAttribute("data-ready", "true");

    // IO fired: the card is in the locked 1280x800 viewport, so the
    // observer should have intersected within a frame or two of mount.
    // The 5s timeout absorbs any GSAP-driven gate fade-in delay.
    await expect(firstCard).toHaveAttribute("data-animated", "true", { timeout: 5_000 });
  });
});
