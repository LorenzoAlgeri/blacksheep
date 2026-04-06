/**
 * Generate ADMIN_PASSWORD_HASH_B64 for Vercel env vars.
 *
 * Usage:
 *   node scripts/generate-admin-hash.mjs <password>
 *
 * Example:
 *   node scripts/generate-admin-hash.mjs blacksheep2026
 *
 * Copy the ADMIN_PASSWORD_HASH_B64 output and set it as env var on Vercel.
 */

import { hashSync } from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/generate-admin-hash.mjs <password>");
  process.exit(1);
}

const hash = hashSync(password, 10);
const b64 = Buffer.from(hash).toString("base64");

console.log("\n--- Vercel Environment Variables ---\n");
console.log(`ADMIN_EMAIL=info@lorenzoalgeri.it`);
console.log(`ADMIN_PASSWORD_HASH_B64=${b64}`);
console.log("\n--- Done ---\n");
