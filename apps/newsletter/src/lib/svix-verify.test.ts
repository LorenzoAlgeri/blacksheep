import { describe, it, expect } from "vitest";
import { verifySvixSignature, signSvixPayload, type SvixHeaders } from "./svix-verify";

// Dummy test secret (base64 payload). Real Svix secrets carry a "whsec_"
// prefix which the verifier strips; the prefix-stripping is covered by its own
// test below. Kept prefix-less here so secret scanners don't flag the fixture.
const SECRET = "c3ZpeC10ZXN0LXNlY3JldA=="; // gitleaks:allow — dummy test fixture, not a real secret
const PREFIXED = `whsec_${SECRET}`; // built at runtime, not a literal
const ID = "msg_2abc";
const BODY = JSON.stringify({ type: "email.bounced", data: { to: ["a@b.com"] } });

function freshTimestamp(nowMs: number): string {
  return String(Math.floor(nowMs / 1000));
}

describe("verifySvixSignature", () => {
  const now = 1_700_000_000_000;
  const ts = freshTimestamp(now);
  const goodSig = signSvixPayload(SECRET, ID, ts, BODY);

  it("accepts a correctly signed payload", () => {
    const headers: SvixHeaders = { id: ID, timestamp: ts, signature: goodSig };
    expect(verifySvixSignature(SECRET, headers, BODY, now)).toBe(true);
  });

  it("accepts when multiple space-separated signatures are present", () => {
    const headers: SvixHeaders = {
      id: ID,
      timestamp: ts,
      signature: `v1,AAAAinvalidAAAA ${goodSig}`,
    };
    expect(verifySvixSignature(SECRET, headers, BODY, now)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const headers: SvixHeaders = { id: ID, timestamp: ts, signature: goodSig };
    expect(verifySvixSignature(SECRET, headers, BODY + "x", now)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const headers: SvixHeaders = { id: ID, timestamp: ts, signature: goodSig };
    expect(verifySvixSignature("d3Jvbmctc2VjcmV0", headers, BODY, now)).toBe(false);
  });

  it("strips the whsec_ prefix (prefixed and bare secrets are equivalent)", () => {
    const sig = signSvixPayload(PREFIXED, ID, ts, BODY);
    // Signed with the prefixed secret, verified with the prefixed secret.
    expect(
      verifySvixSignature(PREFIXED, { id: ID, timestamp: ts, signature: sig }, BODY, now),
    ).toBe(true);
    // ...and verifying the same signature with the bare secret also passes,
    // proving the prefix is stripped on both sign and verify paths.
    expect(verifySvixSignature(SECRET, { id: ID, timestamp: ts, signature: sig }, BODY, now)).toBe(
      true,
    );
  });

  it("rejects missing headers", () => {
    expect(
      verifySvixSignature(SECRET, { id: null, timestamp: ts, signature: goodSig }, BODY, now),
    ).toBe(false);
    expect(
      verifySvixSignature(SECRET, { id: ID, timestamp: null, signature: goodSig }, BODY, now),
    ).toBe(false);
    expect(verifySvixSignature(SECRET, { id: ID, timestamp: ts, signature: null }, BODY, now)).toBe(
      false,
    );
  });

  it("rejects a stale timestamp (replay protection)", () => {
    const staleTs = freshTimestamp(now - 10 * 60 * 1000); // 10 min old
    const sig = signSvixPayload(SECRET, ID, staleTs, BODY);
    const headers: SvixHeaders = { id: ID, timestamp: staleTs, signature: sig };
    expect(verifySvixSignature(SECRET, headers, BODY, now)).toBe(false);
  });

  it("rejects a non-numeric timestamp", () => {
    const headers: SvixHeaders = { id: ID, timestamp: "not-a-number", signature: goodSig };
    expect(verifySvixSignature(SECRET, headers, BODY, now)).toBe(false);
  });

  it("rejects a signature with the wrong version tag", () => {
    const raw = goodSig.split(",")[1];
    const headers: SvixHeaders = { id: ID, timestamp: ts, signature: `v0,${raw}` };
    expect(verifySvixSignature(SECRET, headers, BODY, now)).toBe(false);
  });
});
