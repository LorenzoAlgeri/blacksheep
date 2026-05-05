import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { seedBlackSheepListE2E } from "./seed";

/**
 * Playwright global setup. Runs once before workers spin up — does the
 * heavy Supabase reset/seed for the BlackSheep List spec so individual
 * tests can assume a known dataset.
 *
 * Skips gracefully when Supabase env vars are not present so unrelated
 * specs (cookiebot, visual-email) can still run without Supabase
 * credentials wired in.
 */
export default async function globalSetup(): Promise<void> {
  loadEnvConfig(path.resolve(__dirname, ".."));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
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
