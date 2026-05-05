import { expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Helpers for the BlackSheep List E2E suite.
 *
 * Centralizes:
 *  - basePath-aware navigation (`gotoNewsletterHome`)
 *  - dialog discovery (the app uses native `<dialog>` opened via
 *    `showModal()`, so the live element is `dialog[open]`)
 *  - form fill on the EventRegistrationForm (placeholder + label-based
 *    selectors so the helpers survive cosmetic copy edits as long as
 *    the inputs keep their semantic shape)
 *  - WCAG checks via axe-core scoped to a specific element
 */

export const BASE_PATH = "/newsletter";
export const HOME_URL = `${BASE_PATH}`;

/**
 * Navigate to the newsletter homepage and wait for the events list to
 * mount. EventsListGate honors prefers-reduced-motion (set globally in
 * playwright.config.ts), so the gate opens immediately.
 */
export async function gotoNewsletterHome(page: Page): Promise<void> {
  await page.goto(HOME_URL);
  await page.waitForLoadState("domcontentloaded");
  // The gate flips data-events-gate-mounted to "true" once the mascotte
  // intro fires its end event OR reduced motion is on. Wait on this
  // attribute rather than a network idle to keep the wait deterministic.
  await page
    .locator('[data-events-gate-mounted="true"]')
    .first()
    .waitFor({ state: "attached", timeout: 15_000 });
}

/**
 * Open the registration flow for the event card identified by `slug`.
 *
 * EventCard does not expose the slug as a DOM attribute (the rendering
 * is purely visual), so we identify the card by a regex built from the
 * first slug tokens uppercased. The regex tolerates the per-word
 * `<span data-bs-word>` wrappers that EventCard uses for its staggered
 * title animation — those collapse the textContent without spaces, so
 * a literal title hasText match would not work.
 *
 * If the EventCard implementation later exposes a stable
 * `data-event-slug` attribute (cross-track suggestion from the code
 * review), this helper can be simplified to a single attribute query.
 */
export async function openEventRegistration(page: Page, eventSlug: string): Promise<void> {
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: /entra in lista/i }) })
    .filter({ hasText: deriveTitlePrefix(eventSlug) })
    .first();
  await card.scrollIntoViewIfNeeded();
  await card.getByRole("button", { name: /entra in lista/i }).click();
}

/**
 * Convert a slug like `e2e-monday-club-night` into a regex that
 * matches the first three slug tokens uppercased, separated by an
 * optional whitespace pattern so it survives both the visual
 * rendering and the textContent (no-whitespace) form produced by
 * the per-word `<span>` wrappers.
 */
function deriveTitlePrefix(slug: string): RegExp {
  const tokens = slug.split("-").slice(0, 3);
  const pattern = tokens.map((t) => escapeRegex(t.toUpperCase())).join("\\s*");
  return new RegExp(pattern, "i");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a locator for the currently-open native `<dialog>`. The
 * Dialog primitive renders `<dialog role="dialog" aria-modal="true">`
 * and toggles the `open` attribute via `showModal()` — that's the only
 * dialog ever in the open state during a test, so `dialog[open]` is a
 * unique selector.
 */
export function openDialog(page: Page): Locator {
  return page.locator("dialog[open]");
}

/**
 * Fill the event registration form (email + emailConfirmation) and
 * submit. Selectors target the stable IDs (`#reg-email`,
 * `#reg-email-confirm`) defined in EventRegistrationForm.tsx.
 */
export async function fillRegistrationForm(
  page: Page,
  email: string,
  confirmation: string = email,
): Promise<void> {
  const dialog = openDialog(page);
  await dialog.locator("#reg-email").fill(email);
  await dialog.locator("#reg-email-confirm").fill(confirmation);
  await dialog.getByRole("button", { name: /entra in lista/i }).click();
}

export async function expectNoAxeViolationsInDialog(page: Page): Promise<void> {
  const dialog = openDialog(page);
  await expect(dialog).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include("dialog[open]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations,
    `axe-core violations:\n${formatViolations(results.violations)}`,
  ).toEqual([]);
}

export async function expectNoAxeViolationsOnPage(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations,
    `axe-core violations:\n${formatViolations(results.violations)}`,
  ).toEqual([]);
}

function formatViolations(violations: { id: string; description: string; nodes: unknown[] }[]) {
  return violations.map((v) => `- [${v.id}] ${v.description} (${v.nodes.length} nodes)`).join("\n");
}

/**
 * Assert that the open dialog satisfies the basic ARIA modal contract:
 *  - aria-modal="true" (set by Dialog.tsx)
 *  - aria-labelledby points at a heading with non-empty text
 *  - role="dialog" (also set explicitly on `<dialog>`)
 */
export async function expectAriaModalContract(page: Page): Promise<void> {
  const dialog = openDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog).toHaveAttribute("role", "dialog");

  const labelledById = await dialog.getAttribute("aria-labelledby");
  expect(labelledById, "dialog must have aria-labelledby").not.toBeNull();
  const heading = page.locator(`#${labelledById}`);
  await expect(heading).toBeVisible();
  const headingText = (await heading.textContent())?.trim() ?? "";
  expect(headingText.length).toBeGreaterThan(0);
}

/**
 * Press ESC and confirm the dialog actually closed — the Dialog
 * primitive intercepts `cancel` and calls onClose, so the open
 * attribute should drop within the expect timeout.
 */
export async function expectEscapeClosesDialog(page: Page): Promise<void> {
  const dialog = openDialog(page);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
}

/**
 * Assert that the page's active element is currently inside the open
 * dialog. Native `<dialog>.showModal()` moves initial focus into the
 * dialog and applies `inert` to the rest of the page — that ensures
 * the page outside the dialog can't be reached by clicks or keyboard,
 * which is the contract that matters for an a11y modal.
 *
 * We deliberately do NOT assert a Tab-cycle wrap-around: native
 * `<dialog>` does not strictly cycle Tab when there is only one
 * focusable element (e.g. a "Chiudi" button), and Chromium's exact
 * behaviour at the focus boundary is implementation-defined. The
 * inert + initial-focus contract above is what users actually rely
 * on, so we lock that down and leave the rest to the platform.
 */
export async function expectFocusInsideDialog(page: Page): Promise<void> {
  const dialog = openDialog(page);
  await expect(dialog).toBeVisible();
  // Wait for browsers that focus the dialog asynchronously after
  // showModal() resolves.
  await expect
    .poll(
      async () =>
        dialog.evaluate(
          (el) => el === document.activeElement || el.contains(document.activeElement),
        ),
      { timeout: 5_000 },
    )
    .toBe(true);
}
