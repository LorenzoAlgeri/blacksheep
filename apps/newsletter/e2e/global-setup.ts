import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { seedBlackSheepListE2E } from "./seed";

/**
 * Playwright global setup. Runs once before workers spin up — does the
 * heavy Supabase reset/seed for the BlackSheep List spec so individual
 * tests can assume a known dataset.
 *
 * In CI we MUST fail loud when Supabase credentials are missing —
 * otherwise the seed silently no-ops and every BlackSheep List
 * scenario fails later with confusing 500/empty-state errors.
 *
 * In local dev (no CI env, no E2E_REQUIRE_SEED opt-in) we still skip
 * gracefully so the unrelated specs (cookiebot, visual-email) keep
 * running on a workstation without service-role creds wired up.
 */
export default async function globalSetup(): Promise<void> {
  loadEnvConfig(path.resolve(__dirname, ".."));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const isCI = process.env.CI === "true" || process.env.CI === "1";
    const requireSeed = process.env.E2E_REQUIRE_SEED === "1";
    if (isCI || requireSeed) {
      throw new Error(
        "[e2e global-setup] Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the runner env (CI=true or E2E_REQUIRE_SEED=1 makes this a hard error).",
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[e2e global-setup] Skipping BlackSheep List seed — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/newsletter/.env.local to enable.",
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.log("[e2e global-setup] Seeding BlackSheep List dataset...");
  const result = await seedBlackSheepListE2E();
  // eslint-disable-next-line no-console
  console.log(
    `[e2e global-setup] Seed OK — event=${result.inserted.event} subscribers=${result.inserted.subscribers} registrations=${result.inserted.registrations}`,
  );
}
