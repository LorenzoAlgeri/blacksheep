import { test, expect, type BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT_DIR = "C:/temp/blacksheep-cookiebot";
const NEWSLETTER = "/newsletter";
const ADMIN_LOGIN = "/newsletter/admin/login";

// Cookiebot standard selectors
const DIALOG = "#CybotCookiebotDialog";
const ACCEPT_ALL = "#CybotCookiebotDialogBodyLevelButtonAcceptAll";

// Cookiebot only shows the banner on domains authorized in the Cookiebot Manager.
// On localhost, the banner is intentionally suppressed by Cookiebot.
// To authorize localhost: Cookiebot Manager → Domain group → add "localhost".
// These tests are designed to pass on authorized domains (staging/production).
const BANNER_TIMEOUT = 10_000;

async function freshContext(context: BrowserContext) {
  await context.clearCookies();
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function waitForBannerOrSkip(page: import("@playwright/test").Page) {
  const dialog = page.locator(DIALOG);
  try {
    await dialog.waitFor({ state: "visible", timeout: BANNER_TIMEOUT });
    return true;
  } catch {
    const isLocalhost = page.url().includes("localhost");
    if (isLocalhost) {
      console.warn(
        "Cookiebot banner not shown on localhost — domain not authorized in Cookiebot Manager. " +
          "Add 'localhost' to the domain group at https://manage.cookiebot.com to test locally.",
      );
      return false;
    }
    throw new Error(
      `Cookiebot dialog (#CybotCookiebotDialog) not found within ${BANNER_TIMEOUT}ms`,
    );
  }
}

// --- /newsletter: banner on first visit ---

test("cookiebot: banner appears on first visit to /newsletter (desktop)", async ({
  page,
  context,
}) => {
  ensureOutDir();
  await freshContext(context);

  await page.goto(NEWSLETTER);
  await page.waitForLoadState("networkidle");

  const bannerVisible = await waitForBannerOrSkip(page);
  if (!bannerVisible) {
    test.skip();
    return;
  }

  await expect(page.locator(DIALOG)).toBeVisible();

  await page.screenshot({
    path: path.join(OUT_DIR, "cookiebot-banner-first-visit-desktop.png"),
    fullPage: false,
  });
});

test("cookiebot: accept all dismisses banner and persists on reload (desktop)", async ({
  page,
  context,
}) => {
  ensureOutDir();
  await freshContext(context);

  await page.goto(NEWSLETTER);
  await page.waitForLoadState("networkidle");

  const bannerVisible = await waitForBannerOrSkip(page);
  if (!bannerVisible) {
    test.skip();
    return;
  }

  await page.click(ACCEPT_ALL);
  await expect(page.locator(DIALOG)).not.toBeVisible({ timeout: 5_000 });

  await page.screenshot({
    path: path.join(OUT_DIR, "cookiebot-after-accept-desktop.png"),
    fullPage: false,
  });

  // Reload: banner should NOT reappear (consent persisted in cookie)
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.locator(DIALOG)).not.toBeVisible({ timeout: 3_000 });
});

test("cookiebot: banner appears on first visit (mobile)", async ({ page, context }) => {
  ensureOutDir();
  await freshContext(context);

  await page.goto(NEWSLETTER);
  await page.waitForLoadState("networkidle");

  const bannerVisible = await waitForBannerOrSkip(page);
  if (!bannerVisible) {
    test.skip();
    return;
  }

  await expect(page.locator(DIALOG)).toBeVisible();

  await page.screenshot({
    path: path.join(OUT_DIR, "cookiebot-banner-mobile.png"),
    fullPage: false,
  });
});

// --- /newsletter/admin/login: banner also appears (shared root layout) ---

test("cookiebot: banner appears on admin login (desktop)", async ({ page, context }) => {
  ensureOutDir();
  await freshContext(context);

  await page.goto(ADMIN_LOGIN);
  await page.waitForLoadState("networkidle");

  const bannerVisible = await waitForBannerOrSkip(page);
  if (!bannerVisible) {
    test.skip();
    return;
  }

  await expect(page.locator(DIALOG)).toBeVisible();

  await page.screenshot({
    path: path.join(OUT_DIR, "cookiebot-on-admin-login-desktop.png"),
    fullPage: false,
  });
});

test("cookiebot: admin login form accessible after banner dismiss (desktop)", async ({
  page,
  context,
}) => {
  ensureOutDir();
  await freshContext(context);

  await page.goto(ADMIN_LOGIN);
  await page.waitForLoadState("networkidle");

  const bannerVisible = await waitForBannerOrSkip(page);
  if (!bannerVisible) {
    test.skip();
    return;
  }

  await page.click(ACCEPT_ALL);
  await expect(page.locator(DIALOG)).not.toBeVisible({ timeout: 5_000 });

  await page.screenshot({
    path: path.join(OUT_DIR, "admin-login-after-cookie-accept-desktop.png"),
    fullPage: false,
  });

  // Verify admin form is fully accessible post-dismiss (no overlay conflict)
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.getByRole("button", { name: /accedi/i });

  await expect(emailInput).toBeVisible({ timeout: 3_000 });
  await expect(passwordInput).toBeVisible({ timeout: 3_000 });
  await expect(submitButton).toBeVisible({ timeout: 3_000 });

  await emailInput.click();
  await expect(emailInput).toBeFocused();
});
