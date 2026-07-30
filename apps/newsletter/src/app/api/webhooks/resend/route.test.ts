import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted state controlling the Supabase mock + signature verification
// ---------------------------------------------------------------------------
const { state } = vi.hoisted(() => ({
  state: {
    signatureValid: true,
    updateError: null as null | { message: string },
    updateCount: 1,
    updateCalls: [] as { values: unknown; filters: string[] }[],
  },
}));

vi.mock("@/lib/svix-verify", () => ({
  verifySvixSignature: vi.fn(() => state.signatureValid),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: vi.fn(() => {
      const call = { values: undefined as unknown, filters: [] as string[] };
      const chain: Record<string, (...a: unknown[]) => unknown> = {};
      chain.update = vi.fn((...args: unknown[]) => {
        call.values = args[0];
        return chain;
      });
      chain.ilike = vi.fn((...args: unknown[]) => {
        call.filters.push(`ilike:${String(args[0])}=${String(args[1])}`);
        return chain;
      });
      // Terminal filter — resolves the query as a thenable
      chain.neq = vi.fn((...args: unknown[]) => {
        call.filters.push(`neq:${String(args[0])}=${String(args[1])}`);
        state.updateCalls.push(call);
        return Promise.resolve({
          data: null,
          error: state.updateError,
          count: state.updateError ? null : state.updateCount,
        });
      });
      return chain;
    }),
  }),
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------
let POST: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  state.signatureValid = true;
  state.updateError = null;
  state.updateCount = 1;
  state.updateCalls = [];
  // Signature verification is mocked below, so this value is never parsed.
  process.env.RESEND_WEBHOOK_SECRET = "test-secret";
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
});

function makeReq(body: unknown): Request {
  return new Request("http://localhost:3000/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_1",
      "svix-timestamp": "1700000000",
      "svix-signature": "v1,sig",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/webhooks/resend", () => {
  it("marks the subscriber blocked on a hard bounce", async () => {
    const res = await POST(
      makeReq({
        type: "email.bounced",
        data: { to: ["dead@example.com"], bounce: { type: "Permanent" } },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ ok: true, handled: true, reason: "hard_bounce", blocked: 1 });
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0].values).toEqual({ status: "blocked" });
    expect(state.updateCalls[0].filters).toContain("ilike:email=dead@example.com");
    expect(state.updateCalls[0].filters).toContain("neq:status=blocked");
  });

  it("marks the subscriber blocked on a complaint", async () => {
    const res = await POST(
      makeReq({ type: "email.complained", data: { to: ["spam@example.com"] } }),
    );
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ handled: true, reason: "complaint" });
  });

  it("does NOT block on a soft/transient bounce", async () => {
    const res = await POST(
      makeReq({
        type: "email.bounced",
        data: { to: ["busy@example.com"], bounce: { type: "Transient" } },
      }),
    );
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ ok: true, handled: false });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("acknowledges unrelated events without touching the DB", async () => {
    const res = await POST(makeReq({ type: "email.delivered", data: { to: ["ok@example.com"] } }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ handled: false });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("returns 401 on an invalid signature and does not touch the DB", async () => {
    state.signatureValid = false;
    const res = await POST(
      makeReq({
        type: "email.bounced",
        data: { to: ["x@example.com"], bounce: { type: "Permanent" } },
      }),
    );
    expect(res.status).toBe(401);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("returns 500 when the webhook secret is not configured", async () => {
    vi.resetModules();
    delete process.env.RESEND_WEBHOOK_SECRET;
    const mod = await import("./route");
    const localPOST = mod.POST as unknown as typeof POST;
    const res = await localPOST(
      makeReq({ type: "email.bounced", data: { to: ["x@example.com"] } }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 400 on malformed JSON (valid signature but unparseable body)", async () => {
    const res = await POST(makeReq("{not json"));
    expect(res.status).toBe(400);
  });

  it("still returns 200 when the DB update errors (logs, does not crash)", async () => {
    state.updateError = { message: "db down" };
    const res = await POST(
      makeReq({
        type: "email.bounced",
        data: { to: ["x@example.com"], bounce: { type: "Permanent" } },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ handled: true, blocked: 0 });
  });
});
