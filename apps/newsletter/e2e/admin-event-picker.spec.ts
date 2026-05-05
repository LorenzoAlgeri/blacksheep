import { test, expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";

/**
 * Visual smoke test for the BrandedDateTimePicker on the admin event form.
 *
 * Logs in via NextAuth credentials (reads ADMIN_EMAIL from .env.local and
 * ADMIN_E2E_PASSWORD from the runner env — the production hash in
 * ADMIN_PASSWORD_HASH_B64 cannot be reversed, so the runner must supply
 * the plain password).
 *
 * Captures three states of the picker as test attachments so they appear
 * inline in the HTML report at apps/newsletter/playwright-report/index.html
 * (the HTML reporter empties that folder on every run, so we can't drop
 * loose PNGs alongside it). A copy is also saved under
 * `apps/newsletter/picker-screenshots/` for offline review with stable,
 * descriptive filenames.
 */

const BASE_PATH = "/newsletter";
const SCREENSHOT_DIR = path.resolve(__dirname, "../picker-screenshots");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD;

async function captureState(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: { fullPage?: boolean; element?: ReturnType<Page["locator"]> } = {},
): Promise<void> {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  const buffer = options.element
    ? await options.element.screenshot({ path: filePath })
    : await page.screenshot({ path: filePath, fullPage: options.fullPage ?? true });
  await testInfo.attach(name, { body: buffer, contentType: "image/png" });
}

test.describe("admin · branded datetime picker · visual smoke", () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Set ADMIN_EMAIL (in apps/newsletter/.env.local) and ADMIN_E2E_PASSWORD (in the runner env) to enable",
  );

  test("captures three states of the picker on /admin/events/new", async ({ page }, testInfo) => {
    await loginAsAdmin(page);

    await page.goto(`${BASE_PATH}/admin/events/new`);
    await expect(page.getByRole("heading", { name: /nuovo evento/i })).toBeVisible();

    // The trigger button is the picker's accessible entry point — wait until
    // the form has hydrated and the React-Hook-Form Controller has wired the
    // picker, otherwise the click below races the mount.
    const trigger = page.getByRole("button", { name: /apri selettore data e ora/i });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // === STATE 1 — closed input ===
    await captureState(page, testInfo, "picker-state-1-closed");

    // === STATE 2 — calendar open ===
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: /selettore data e ora/i });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // ARIA grid pattern: every gridcell must descend from a row (checked here
    // in a real browser to complement the jsdom unit assertion).
    const rows = dialog.getByRole("row");
    await expect(rows).toHaveCount(7); // 1 weekday header + 6 weeks
    const cells = dialog.getByRole("gridcell");
    await expect(cells).toHaveCount(42);

    await captureState(page, testInfo, "picker-state-2-calendar-open");
    // Element-scoped capture so the popover is centered + uncropped, even
    // when the form sits near the bottom of the viewport.
    await captureState(page, testInfo, "picker-state-2-dialog-only", { element: dialog });

    // === STATE 3 — time spinner ===
    // Already visible in state 2; assert the spinner controls + values are
    // rendered, then capture a focused screenshot so the hour/minute area
    // is unambiguous in the artifact.
    await expect(dialog.getByRole("button", { name: /aumenta ore/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /diminuisci ore/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /aumenta minuti/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /diminuisci minuti/i })).toBeVisible();
    await expect(dialog.getByTestId("bdtp-hour-display")).toHaveText(/^\d{2}$/);
    await expect(dialog.getByTestId("bdtp-minute-display")).toHaveText(/^\d{2}$/);

    await captureState(page, testInfo, "picker-state-3-time-spinner");

    // Confirm Conferma + Annulla are present (and reachable for keyboard
    // users) — the visual report should make the action affordances clear.
    await expect(dialog.getByRole("button", { name: /conferma/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /annulla/i })).toBeVisible();
  });
});

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_PATH}/admin/login`);
  await page.getByRole("textbox", { name: /email/i }).fill(ADMIN_EMAIL!);
  await page.getByRole("textbox", { name: /password/i }).fill(ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /accedi/i }).click();
  // The login page calls signIn(redirect:false) then does a hard
  // window.location.href to /admin — wait until we've left /admin/login.
  await page.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 15_000 });
}
