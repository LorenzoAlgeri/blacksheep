import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted state
// ---------------------------------------------------------------------------
const { state } = vi.hoisted(() => ({
  state: {
    upsertError: null as unknown,
    deleteError: null as unknown,
    lookupResult: null as null | { id: string },
    fromCalls: [] as string[],
  },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/supabase", () => {
  function makeBuilder(singleResolve?: () => Promise<unknown>) {
    const b: Record<string, (...a: unknown[]) => unknown> = {};
    b.select = vi.fn(() => b);
    b.eq = vi.fn(() => b);
    b.maybeSingle = vi.fn(() => Promise.resolve({ data: state.lookupResult, error: null }));
    b.single = singleResolve
      ? vi.fn(singleResolve)
      : vi.fn(() => Promise.resolve({ data: null, error: null }));
    b.upsert = vi.fn(() => Promise.resolve({ data: null, error: state.upsertError ?? null }));
    b.delete = vi.fn(() => b);
    // When chained after .delete().eq(), resolves with deleteError
    // Override eq to resolve the promise when called in delete chain
    const originalEq = b.eq;
    b.eq = vi.fn((...args) => {
      // Return a thenable so await works on the chain
      const result = originalEq(...args);
      return Object.assign(result, {
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: state.deleteError ?? null }).then(resolve),
        catch: (reject: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: state.deleteError ?? null }).catch(reject),
      });
    });
    return b;
  }

  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        state.fromCalls.push(table);
        return makeBuilder();
      }),
    }),
  };
});

vi.mock("@/lib/rate-limit", () => ({
  rateLimitPushSubscribe: vi.fn(() => true),
}));
vi.mock("@/lib/client-ip", () => ({
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------
let POST: (req: Request) => Promise<Response>;
let DELETE: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  state.upsertError = null;
  state.deleteError = null;
  state.lookupResult = null;
  state.fromCalls = [];
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
  DELETE = mod.DELETE as unknown as typeof DELETE;
});

function makeReq(body: Record<string, unknown> = {}): Request {
  const defaultBody = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    keys: { p256dh: "BNcRdre", auth: "tBHItq" },
    ...body,
  };
  return new Request("http://localhost:3000/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(defaultBody),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/push/subscribe", () => {
  it("returns { ok: true } for a valid subscription", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ ok: true });
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when endpoint is missing", async () => {
    const res = await POST(makeReq({ endpoint: undefined, keys: { p256dh: "abc", auth: "def" } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when keys.p256dh is empty", async () => {
    const res = await POST(
      makeReq({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { p256dh: "", auth: "def" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when endpoint is not HTTPS", async () => {
    const res = await POST(
      makeReq({
        endpoint: "http://insecure.example.com/push",
        keys: { p256dh: "abc", auth: "def" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    state.upsertError = { message: "db error", code: "XX000" };
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toBe("Errore interno. Riprova.");
  });

  it("accepts optional subscriberEmail field without error", async () => {
    state.lookupResult = { id: "sub-123" };
    const res = await POST(makeReq({ subscriberEmail: "test@example.com" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ ok: true });
  });

  // Keep this test last — vi.doMock overrides the hoisted vi.mock and
  // cannot be cleanly undone within the same describe block.
  it("returns 429 when rate limited", async () => {
    vi.resetModules();
    vi.doMock("@/lib/rate-limit", () => ({
      rateLimitPushSubscribe: vi.fn(() => false),
    }));
    const mod = await import("./route");
    const localPOST = mod.POST as unknown as typeof POST;
    const res = await localPOST(makeReq());
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/push/subscribe
// Note: these tests re-import the module with the hoisted vi.mock (not the
// vi.doMock from the 429 test above) to get a fresh rate-limit stub that
// returns true.
// ---------------------------------------------------------------------------
function makeDeleteReq(body: Record<string, unknown> = {}): Request {
  const defaultBody = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    ...body,
  };
  return new Request("http://localhost:3000/api/push/subscribe", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(defaultBody),
  });
}

describe("DELETE /api/push/subscribe", () => {
  let localDELETE: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    // Restore the hoisted mock so rate limiting returns true
    vi.doMock("@/lib/rate-limit", () => ({
      rateLimitPushSubscribe: vi.fn(() => true),
    }));
    state.deleteError = null;
    state.fromCalls = [];
    const mod = await import("./route");
    localDELETE = mod.DELETE as unknown as typeof localDELETE;
  });

  it("deletes subscription by endpoint", async () => {
    const res = await localDELETE(makeDeleteReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ ok: true });
  });

  it("returns ok even if endpoint not found (idempotent)", async () => {
    // Supabase delete on a non-existent row does not return an error — it's a no-op.
    // Confirm our handler treats a successful (no-error) response as { ok: true }.
    state.deleteError = null;
    const res = await localDELETE(
      makeDeleteReq({ endpoint: "https://fcm.googleapis.com/fcm/send/nonexistent" }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ ok: true });
  });
});
