import { test, expect, type Page } from "@playwright/test";
import path from "path";

const OUT_DIR = "C:/temp/blacksheep-email-tier1";
const HOME = "/newsletter";

// alert locator that excludes the Next.js route announcer
const disposableAlert = (page: Page) =>
  page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first();

async function fillAndBlurEmail(page: Page, locator: string, value: string) {
  const input = page.locator(locator);
  await input.fill(value);
  await input.blur();
}

async function gotoNewsletter(page: Page) {
  await page.goto(HOME);
  await page.waitForLoadState("networkidle");
  const emailInput = page.locator('input[placeholder="La tua email"]');
  await emailInput.waitFor({ state: "visible", timeout: 20_000 });
  await emailInput.scrollIntoViewIfNeeded();
}

// --- SubscribeForm: confirm mismatch (desktop) ---

test("newsletter: confirm mismatch desktop screenshot", async ({ page }) => {
  await gotoNewsletter(page);

  await fillAndBlurEmail(page, 'input[placeholder="La tua email"]', "test@gmail.com");
  await fillAndBlurEmail(page, 'input[id="email-confirmation"]', "other@gmail.com");

  await page.getByRole("button", { name: /ISCRIVITI/i }).click();
  await expect(page.getByText(/non coincidono/i)).toBeVisible({ timeout: 5_000 });

  await page.screenshot({
    path: path.join(OUT_DIR, "newsletter-confirm-mismatch-desktop.png"),
    fullPage: false,
  });
});

// --- SubscribeForm: disposable email (desktop) ---

test("newsletter: disposable email desktop screenshot", async ({ page }) => {
  await gotoNewsletter(page);

  await fillAndBlurEmail(page, 'input[placeholder="La tua email"]', "user@mailinator.com");
  const alert = disposableAlert(page);
  await expect(alert).toBeVisible({ timeout: 5_000 });
  await expect(alert).toContainText(/personale/i);

  await page.locator('input[id="email-confirmation"]').fill("user@mailinator.com");

  let fetchCalled = false;
  await page.route("**/api/subscribe", () => {
    fetchCalled = true;
  });
  await page.getByRole("button", { name: /ISCRIVITI/i }).click();
  await page.waitForTimeout(500);
  expect(fetchCalled).toBe(false);

  await page.screenshot({
    path: path.join(OUT_DIR, "newsletter-disposable-desktop.png"),
    fullPage: false,
  });
});

// --- EventRegistrationForm: disposable email (desktop) ---

test("event: disposable email desktop screenshot", async ({ page }) => {
  const response = await page.goto("/newsletter/dev/event-card-poc");
  if (!response || response.status() === 404) {
    console.log("Dev POC page not available, skipping event screenshot");
    return;
  }
  await page.waitForLoadState("networkidle");

  // Try to open a registration dialog
  const registerBtn = page.getByRole("button", { name: /iscriviti/i }).first();
  if (await registerBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await registerBtn.click();
    await page.waitForTimeout(400);
  }

  const emailInput = page.locator('input[type="email"]').first();
  const emailVisible = await emailInput.isVisible({ timeout: 5_000 }).catch(() => false);
  if (emailVisible) {
    await emailInput.fill("user@yopmail.com");
    await emailInput.blur();
    await page.waitForTimeout(1_000);
  }

  await page.screenshot({
    path: path.join(OUT_DIR, "event-disposable-desktop.png"),
    fullPage: false,
  });
});

// --- SubscribeForm: disposable email (mobile) ---

test("newsletter: disposable email mobile screenshot", async ({ page }) => {
  await gotoNewsletter(page);

  await fillAndBlurEmail(page, 'input[placeholder="La tua email"]', "user@mailinator.com");
  const alert = disposableAlert(page);
  await expect(alert).toBeVisible({ timeout: 5_000 });

  await page.screenshot({ path: path.join(OUT_DIR, "disposable-mobile.png"), fullPage: false });
});
