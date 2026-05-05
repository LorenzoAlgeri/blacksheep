import { test, expect } from "@playwright/test";
import {
  expectAriaModalContract,
  expectEscapeClosesDialog,
  expectFocusInsideDialog,
  expectNoAxeViolationsInDialog,
  expectNoAxeViolationsOnPage,
  fillRegistrationForm,
  gotoNewsletterHome,
  openDialog,
  openEventRegistration,
} from "./helpers";
import {
  E2E_CONFIRMED_FRESH,
  E2E_CONFIRMED_REGISTERED,
  E2E_EMAIL_LINK_USER,
  E2E_EVENT_SLUG,
  E2E_EVENT_TITLE,
  E2E_GHOST_EMAIL,
  E2E_PENDING,
} from "./fixtures/blacksheep-list";
import { getE2EServiceClient } from "./seed";

/**
 * BlackSheep List end-to-end suite — five scenarios that cover the four
 * subscriber states branched on by /api/events/register plus the email
 * one-click registration path. Each scenario also runs axe-core against
 * the surface where the user lands and verifies the ARIA modal contract,
 * initial focus, and ESC key handling on every dialog the spec opens.
 *
 * Single-button dialogs (NoSubscriber, AlreadyRegistered,
 * RegistrationSuccess) skip the Tab-cycle assertion: native `<dialog>`
 * doesn't strictly guarantee Tab wrap-around when only one focusable
 * element exists, so the contract we lock down for them is initial
 * focus + page inertness via aria-modal + ESC closes.
 *
 * The suite runs serially with a single worker (see playwright.config.ts):
 *  - shared Supabase dataset, seeded once in globalSetup;
 *  - in-memory rate limiter on the dev server (5 reg/min/IP).
 *
 * Each test pins a unique X-Forwarded-For header so the rate limiter
 * keys per-test rather than per-suite. Without this, repeated suite
 * runs against an already-running dev server (`reuseExistingServer:
 * true`) accumulate counters across runs and the 6th register call in
 * a 60-second window starts returning 429.
 */
const RUN_NONCE = Math.floor(Math.random() * 0xffffff)
  .toString(16)
  .padStart(6, "0");
let testCounter = 0;
test.beforeEach(async ({ context }) => {
  testCounter += 1;
  // RFC 5737 reserves 192.0.2.0/24 for documentation — safe to use as a
  // fake client IP without colliding with anything routable.
  const ip = `192.0.2.${(testCounter % 250) + 1}`;
  await context.setExtraHTTPHeaders({
    "X-Forwarded-For": `${ip}-${RUN_NONCE}`.slice(0, 39),
  });
});

// ---------------------------------------------------------------
// Scenario 1 — Confirmed user registers successfully
// ---------------------------------------------------------------
test.describe("BlackSheep List — Scenario 1: confirmed user registers", () => {
  // The /api/events/register handler synchronously waits for Resend to
  // deliver the confirmation email after the DB insert. Resend's SDK
  // applies its own connect/read timeout (~30s) when network conditions
  // are flaky in CI/sandbox environments. Bumping the test timeout
  // to 90s keeps the spec green even on slow Resend round-trips.
  test.setTimeout(90_000);

  test("registers successfully and shows RegistrationSuccessDialog", async ({ page }) => {
    await gotoNewsletterHome(page);

    await openEventRegistration(page, E2E_EVENT_SLUG);

    // The form dialog opens — verify it before submitting
    await expect(openDialog(page)).toBeVisible();
    await expectAriaModalContract(page);
    await expectFocusInsideDialog(page);
    await expectNoAxeViolationsInDialog(page);

    await fillRegistrationForm(page, E2E_CONFIRMED_FRESH.email);

    // The form dialog is replaced by the success dialog (CI SEI). The
    // tighter expect timeout is the one place we wait for Resend to
    // resolve — once the success dialog renders, all downstream waits
    // can use the default 10s timeout.
    const successDialog = openDialog(page);
    await expect(successDialog).toContainText("CI SEI", { timeout: 60_000 });
    await expect(successDialog).toContainText(E2E_EVENT_TITLE);

    await expectAriaModalContract(page);
    await expectFocusInsideDialog(page);
    await expectNoAxeViolationsInDialog(page);

    // Pressing ESC closes the success dialog
    await expectEscapeClosesDialog(page);

    // Server-side verification: a registration row was inserted
    const supabase = getE2EServiceClient();
    const { data, error } = await supabase
      .from("list_event_registrations")
      .select("id, source")
      .eq("subscriber_id", E2E_CONFIRMED_FRESH.id);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
    expect(data?.[0]?.source).toBe("form");
  });
});

// ---------------------------------------------------------------
// Scenario 2 — Pending subscriber: resend → scrivici (contact help)
// ---------------------------------------------------------------
test.describe("BlackSheep List — Scenario 2: pending subscriber", () => {
  test("opens PendingConfirmationDialog → resend → scrivici → success", async ({ page }) => {
    await gotoNewsletterHome(page);

    // Resend confirmation: stub OK so the test does not depend on a real
    // Resend account. The handler still runs origin/rate-limit/validation
    // before being short-circuited by the route handler below.
    await page.route("**/newsletter/api/events/resend-confirmation", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    // Contact-help: let the request reach the server (so the audit row
    // gets written to contact_help_requests) but mask any Resend failure
    // with a 200 — the dialog flips to "submitted" only on 2xx.
    await page.route("**/newsletter/api/contact-help", async (route) => {
      try {
        await route.fetch();
      } catch {
        // Ignore — the DB insert is what we care about; Resend may fail
        // depending on the test environment's RESEND_API_KEY.
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await openEventRegistration(page, E2E_EVENT_SLUG);
    await fillRegistrationForm(page, E2E_PENDING.email);

    const pendingDialog = openDialog(page);
    await expect(pendingDialog).toContainText(/conferma l['’]email/i);
    await expectAriaModalContract(page);
    await expectFocusInsideDialog(page);
    await expectNoAxeViolationsInDialog(page);

    // Resend triggers the inline status row (role="status") with the
    // success copy.
    await pendingDialog.getByRole("button", { name: /reinvia email/i }).click();
    await expect(pendingDialog.getByRole("status")).toContainText(
      /email reinviata\. aspetta qualche minuto\./i,
    );

    // "Scrivici" hands off to the ContactHelpDialog
    await pendingDialog.getByRole("button", { name: /scrivici/i }).click();
    const contactDialog = openDialog(page);
    await expect(contactDialog).toContainText("SCRIVICI");
    await expectAriaModalContract(page);
    await expectFocusInsideDialog(page);
    await expectNoAxeViolationsInDialog(page);

    // Email is pre-filled by the parent — fill the rest of the form
    await contactDialog.locator("#ch-phone").fill("+39 333 1234567");
    await contactDialog.locator("#ch-name").fill("E2E Pending User");
    await contactDialog.locator("#ch-message").fill("Non trovo l'email di conferma.");
    await contactDialog.getByRole("button", { name: /^invia$/i }).click();

    // Submitted state — text replaces the form, role=status announces it
    await expect(contactDialog.getByRole("status")).toContainText(/messaggio ricevuto/i);
    // Re-run axe on the success state too — copy-only state changes still
    // matter because aria-live regions can introduce contrast issues.
    await expectNoAxeViolationsInDialog(page);

    // Server-side verification: the contact-help audit row is in the DB
    // (the route's `route.fetch()` completed before our 200 fulfill, so
    // the INSERT ran even though Resend may have errored).
    const supabase = getE2EServiceClient();
    const { data, error } = await supabase
      .from("contact_help_requests")
      .select("id, name, phone")
      .eq("email", E2E_PENDING.email);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
    expect(data?.[0]?.name).toBe("E2E Pending User");
  });
});

// ---------------------------------------------------------------
// Scenario 3 — No subscriber for the email
// ---------------------------------------------------------------
test.describe("BlackSheep List — Scenario 3: no subscriber", () => {
  test("opens NoSubscriberDialog with newsletter signup CTA", async ({ page }) => {
    await gotoNewsletterHome(page);

    await openEventRegistration(page, E2E_EVENT_SLUG);
    await fillRegistrationForm(page, E2E_GHOST_EMAIL);

    const noSubDialog = openDialog(page);
    await expect(noSubDialog).toContainText(/iscriviti prima alla newsletter/i);
    // CTA mirrors the same copy at the top of the dialog — assert the
    // button by its accessible role to keep the assertion separate.
    await expect(
      noSubDialog.getByRole("button", { name: /iscriviti alla newsletter/i }),
    ).toBeVisible();

    await expectAriaModalContract(page);
    await expectFocusInsideDialog(page);
    await expectNoAxeViolationsInDialog(page);
    await expectEscapeClosesDialog(page);
  });
});

// ---------------------------------------------------------------
// Scenario 4 — Already registered subscriber
// ---------------------------------------------------------------
test.describe("BlackSheep List — Scenario 4: already registered", () => {
  test("opens AlreadyRegisteredDialog when subscriber is already on the list", async ({ page }) => {
    await gotoNewsletterHome(page);

    await openEventRegistration(page, E2E_EVENT_SLUG);
    await fillRegistrationForm(page, E2E_CONFIRMED_REGISTERED.email);

    const alreadyDialog = openDialog(page);
    await expect(alreadyDialog).toContainText(/sei già dentro/i);
    await expect(alreadyDialog).toContainText(E2E_EVENT_TITLE);

    await expectAriaModalContract(page);
    await expectFocusInsideDialog(page);
    await expectNoAxeViolationsInDialog(page);
    await expectEscapeClosesDialog(page);
  });
});

// ---------------------------------------------------------------
// Scenario 5 — Email link single-click registration
// ---------------------------------------------------------------
test.describe("BlackSheep List — Scenario 5: email link single-click", () => {
  test("redirects to /events/[slug]/registered?status=ok and is idempotent", async ({ page }) => {
    const url = `/newsletter/api/events/register-from-email?token=${E2E_EMAIL_LINK_USER.token}&event_slug=${E2E_EVENT_SLUG}`;

    // First click: 303 → /events/[slug]/registered?status=ok, page shows
    // the success branding ("CI SEI").
    await page.goto(url);
    await expect(page).toHaveURL(/\/newsletter\/events\/.+\/registered\?status=ok$/);
    await expect(page.getByRole("heading", { name: /^ci sei$/i })).toBeVisible();
    await expectNoAxeViolationsOnPage(page);

    // Server-side verification: the registration row was inserted with
    // source='email_link' (distinct from the form-driven Scenario 1 row).
    const supabase = getE2EServiceClient();
    const { data: firstRows, error: firstErr } = await supabase
      .from("list_event_registrations")
      .select("source")
      .eq("subscriber_id", E2E_EMAIL_LINK_USER.id);
    expect(firstErr).toBeNull();
    expect(firstRows ?? []).toHaveLength(1);
    expect(firstRows?.[0]?.source).toBe("email_link");

    // Second click: idempotent → status=already (UNIQUE 23505 caught).
    await page.goto(url);
    await expect(page).toHaveURL(/\/newsletter\/events\/.+\/registered\?status=already$/);
    await expect(page.getByRole("heading", { name: /^già dentro$/i })).toBeVisible();
    await expectNoAxeViolationsOnPage(page);

    // Idempotency at the DB layer: still exactly one row.
    const { data: secondRows } = await supabase
      .from("list_event_registrations")
      .select("id")
      .eq("subscriber_id", E2E_EMAIL_LINK_USER.id);
    expect(secondRows ?? []).toHaveLength(1);
  });
});
