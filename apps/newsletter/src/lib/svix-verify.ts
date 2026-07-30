/**
 * Svix webhook signature verification (Resend signs its webhooks with Svix).
 *
 * Scheme: HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${rawBody}` using the
 * base64-decoded portion of the `whsec_...` secret. The `svix-signature` header
 * carries one or more space-separated `v1,<base64sig>` entries. We also reject
 * timestamps outside a tolerance window to blunt replay attacks.
 *
 * Implemented with node:crypto to avoid pulling in the `svix` dependency.
 */
import crypto from "node:crypto";

export type SvixHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

const TOLERANCE_SECONDS = 5 * 60;

function timingSafeEqualB64(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "base64");
    const bb = Buffer.from(b, "base64");
    if (ab.length !== bb.length || ab.length === 0) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function verifySvixSignature(
  secret: string,
  headers: SvixHeaders,
  body: string,
  nowMs: number = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(nowMs / 1000);
  if (Math.abs(nowSec - ts) > TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (secretBytes.length === 0) return false;

  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && !!sig && timingSafeEqualB64(sig, expected);
  });
}

/** Test/helper: produce a valid `v1,<sig>` signature header for a given body. */
export function signSvixPayload(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
): string {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${body}`;
  const sig = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  return `v1,${sig}`;
}
