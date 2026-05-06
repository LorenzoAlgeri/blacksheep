import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted state — shared across vi.mock() factories
// ---------------------------------------------------------------------------
const { state } = vi.hoisted(() => ({
  state: {
    /** Result of the initial subscribers lookup (null = new subscriber) */
    lookupResult: null as null | { id: string; token: string; status: string },
    /** Token returned by upsert */
    upsertToken: "upsert-token-abc",
    /** Simulated upsert DB error */
    upsertError: null as unknown,
    /** Simulated Resend send error */
    resendError: null as unknown,
    /** Track every table name passed to supabase.from() */
    fromCalls: [] as string[],
    /** Track actual Resend send() calls */
    sendCalls: 0,
  },
}));

// ---------------------------------------------------------------------------
// Supabase mock
// We need to handle two distinct call patterns on "subscribers":
//  1. Lookup: .select().eq().single()   → state.lookupResult
//  2. Upsert: .upsert().select().single() → { token: upsertToken }
//  3. Timing-normalize: .select().eq().maybeSingle() → { data: null }
// And one on "site_config":
//  4. Config: .select().eq().single()   → { tagline, venue }
//  5. Timing-normalize: .select().eq().maybeSingle() → { data: null }
// ---------------------------------------------------------------------------
vi.mock("@/lib/supabase", () => {
  function maybeSingleResult() {
    return Promise.resolve({ data: null, error: null });
  }

  function makeBuilder(singleResolve: () => Promise<unknown>) {
    const b: Record<string, (...a: unknown[]) => unknown> = {};
    b.select = vi.fn(() => b);
    b.eq = vi.fn(() => b);
    b.single = vi.fn(singleResolve);
    b.maybeSingle = vi.fn(maybeSingleResult);
    b.upsert = vi.fn(() => {
      const inner: Record<string, (...a: unknown[]) => unknown> = {};
      inner.select = vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: state.upsertError ? null : { token: state.upsertToken },
            error: state.upsertError ?? null,
          }),
        ),
      }));
      return inner;
    });
    return b;
  }

  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        state.fromCalls.push(table);
        if (table === "site_config") {
          return makeBuilder(() =>
            Promise.resolve({
              data: { tagline: "EVERY MONDAY", venue: "11 Clubroom" },
              error: null,
            }),
          );
        }
        // "subscribers"
        return makeBuilder(() => Promise.resolve({ data: state.lookupResult, error: null }));
      }),
    }),
  };
});

vi.mock("@/lib/resend", () => ({
  getResend: () => ({
    emails: {
      send: vi.fn(() => {
        state.sendCalls++;
        return Promise.resolve({ error: state.resendError ?? null });
      }),
    },
  }),
}));

vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(() => true) }));
vi.mock("@/lib/client-ip", () => ({
  getClientIp: vi.fn(() => "1.2.3.4"),
  getUserAgent: vi.fn(() => "test-agent"),
}));
vi.mock("@/lib/emails/confirmation", () => ({
  renderConfirmationEmail: vi.fn(() => "<html>confirm</html>"),
}));

// ---------------------------------------------------------------------------
// Module under test — re-imported fresh each test for state isolation
// ---------------------------------------------------------------------------
let POST: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  state.lookupResult = null;
  state.upsertToken = "upsert-token-abc";
  state.upsertError = null;
  state.resendError = null;
  state.fromCalls = [];
  state.sendCalls = 0;
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
});

function makeReq(body: Record<string, unknown> = {}): Request {
  const defaultBody = { email: "test@example.com", gender: "female", ...body };
  return new Request("http://localhost:3000/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(defaultBody),
  });
}

// ---------------------------------------------------------------------------
// SEC-MED-05: timing oracle — response shape
// ---------------------------------------------------------------------------
describe("POST /api/subscribe — response shape [SEC-MED-05]", () => {
  it("returns { success: true } for a brand-new subscriber", async () => {
    state.lookupResult = null;
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ success: true });
  });

  it("returns { success: true } for a confirmed subscriber (same shape as new)", async () => {
    state.lookupResult = { id: "sub-1", token: "tok-1", status: "confirmed" };
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ success: true });
  });

  it("returns { success: true } for a pending subscriber (same shape as new)", async () => {
    state.lookupResult = { id: "sub-2", token: "tok-2", status: "pending" };
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ success: true });
  });

  it("returns { success: true } for a blocked subscriber (same shape as new)", async () => {
    state.lookupResult = { id: "sub-3", token: "tok-3", status: "blocked" };
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ success: true });
  });
});

// ---------------------------------------------------------------------------
// SEC-MED-05: timing normalization — confirmed/pending/blocked must run the
// same async DB work as the new-subscriber path before responding, so
// response time leakage cannot be used to enumerate subscriber status.
// We verify this by asserting that from("site_config") is queried even when
// the subscriber already exists (early-exit paths).
// ---------------------------------------------------------------------------
describe("POST /api/subscribe — timing normalization [SEC-MED-05]", () => {
  it("queries site_config even when subscriber is confirmed (prevents timing oracle)", async () => {
    state.lookupResult = { id: "sub-1", token: "tok-1", status: "confirmed" };
    await POST(makeReq());
    expect(state.fromCalls).toContain("site_config");
  });

  it("queries site_config even when subscriber is pending (prevents timing oracle)", async () => {
    state.lookupResult = { id: "sub-2", token: "tok-2", status: "pending" };
    await POST(makeReq());
    expect(state.fromCalls).toContain("site_config");
  });

  it("queries site_config even when subscriber is blocked (prevents timing oracle)", async () => {
    state.lookupResult = { id: "sub-3", token: "tok-3", status: "blocked" };
    await POST(makeReq());
    expect(state.fromCalls).toContain("site_config");
  });
});

// ---------------------------------------------------------------------------
// SEC-MED-05: functional correctness — email must be sent only for new subs
// ---------------------------------------------------------------------------
describe("POST /api/subscribe — email send behaviour [SEC-MED-05]", () => {
  it("sends a confirmation email for a new subscriber", async () => {
    state.lookupResult = null;
    await POST(makeReq());
    expect(state.sendCalls).toBe(1);
  });

  it("does NOT send email to a confirmed subscriber", async () => {
    state.lookupResult = { id: "sub-1", token: "tok-1", status: "confirmed" };
    await POST(makeReq());
    expect(state.sendCalls).toBe(0);
  });

  it("does NOT send email to a pending subscriber", async () => {
    state.lookupResult = { id: "sub-2", token: "tok-2", status: "pending" };
    await POST(makeReq());
    expect(state.sendCalls).toBe(0);
  });

  it("does NOT send email to a blocked subscriber", async () => {
    state.lookupResult = { id: "sub-3", token: "tok-3", status: "blocked" };
    await POST(makeReq());
    expect(state.sendCalls).toBe(0);
  });
});
