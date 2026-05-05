import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the newsletter app.
 *
 * The app is hosted under basePath `/newsletter`, so tests navigate to
 * `/newsletter/...` while baseURL remains `http://localhost:3000`. The
 * BlackSheep List spec relies on:
 *  - `prefers-reduced-motion: reduce` to skip the mascotte intro gate
 *    (EventsListGate.tsx) so EventsList mounts immediately;
 *  - `BLACKSHEEP_LIST_ENABLED=true` injected into the dev server so the
 *    `/api/events/*` endpoints respond instead of 404;
 *  - `globalSetup` to seed deterministic Supabase rows before the run.
 *
 * Single worker on purpose: the BlackSheep List suite shares a Supabase
 * dataset and an in-memory rate limiter, so parallel runs would race.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./e2e/global-setup",
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
      // BlackSheep List spec mutates a shared Supabase dataset (one
      // pre-seeded registration, four subscribers) and is not safe to
      // replay against the data left behind by the desktop project on
      // the same run. Skip it here so cookiebot / visual-email keep
      // running on mobile while the registration suite stays
      // single-project.
      testIgnore: /blacksheep-list\.spec\.ts$/,
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      PORT: "3000",
      BLACKSHEEP_LIST_ENABLED: "true",
    },
  },
});
