/**
 * Deterministic test fixtures for the BlackSheep List E2E suite.
 *
 * IDs and tokens are RFC 4122 v4-compliant (version digit `4` at pos 13,
 * variant digit `8` at pos 17) so Zod's `z.uuid()` accepts them — the
 * /api/events/register-from-email handler validates the token shape with
 * Zod before the DB lookup.
 *
 * Email TLDs use `.test` (RFC 6761 reserved) so the seed cannot accidentally
 * dispatch real mail if Resend is wired in.
 */

export const E2E_EVENT_ID = "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000001";
export const E2E_EVENT_SLUG = "e2e-monday-club-night";
export const E2E_EVENT_TITLE = "BLACK SHEEP — E2E Monday Club Night";
export const E2E_EVENT_VENUE = "11 Clubroom — Corso Como, Milano";

export const E2E_CONFIRMED_FRESH = {
  id: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000010",
  email: "e2e-confirmed-fresh@e2e.test",
  token: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000011",
  name: "E2E Confirmed Fresh",
  status: "confirmed" as const,
  gender: "female" as const,
};

export const E2E_CONFIRMED_REGISTERED = {
  id: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000020",
  email: "e2e-already-registered@e2e.test",
  token: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000021",
  name: "E2E Already Registered",
  status: "confirmed" as const,
  gender: "male" as const,
};

export const E2E_PENDING = {
  id: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000030",
  email: "e2e-pending@e2e.test",
  token: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000031",
  name: "E2E Pending",
  status: "pending" as const,
  gender: null,
};

export const E2E_EMAIL_LINK_USER = {
  id: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000040",
  email: "e2e-email-link@e2e.test",
  token: "5e2ee2ee-aaaa-4aaa-8aaa-aaaa00000041",
  name: "E2E Email Link",
  status: "confirmed" as const,
  gender: "female" as const,
};

export const E2E_GHOST_EMAIL = "e2e-ghost@e2e.test";

export const E2E_SEED_SUBSCRIBERS = [
  E2E_CONFIRMED_FRESH,
  E2E_CONFIRMED_REGISTERED,
  E2E_PENDING,
  E2E_EMAIL_LINK_USER,
] as const;

export const E2E_SEED_SUBSCRIBER_IDS = E2E_SEED_SUBSCRIBERS.map((s) => s.id);
