import { describe, it, expect, vi, beforeEach } from "vitest";

const { state } = vi.hoisted(() => ({
  state: {
    subscriberResult: { data: null as unknown, error: null as unknown },
    deleteError: null as unknown,
  },
}));

vi.mock("@/lib/supabase", () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(state.subscriberResult)),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: state.deleteError })),
    })),
  };
  return { getSupabase: () => ({ from: vi.fn(() => builder) }) };
});

let POST: (req: Request) => Promise<Response>;

const VALID_TOKEN = "11111111-2222-4333-8444-555555555555";

beforeEach(async () => {
  vi.resetModules();
  state.subscriberResult = { data: null, error: null };
  state.deleteError = null;
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
});

function makeReq(
  opts: { headers?: Record<string, string>; body?: unknown; query?: string } = {},
): Request {
  const url = `http://localhost:3000/api/unsubscribe${opts.query ?? ""}`;
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

describe("POST /api/unsubscribe — GDPR Art. 17 erasure [SEC-009]", () => {
  it("emits a structured audit log with subscriber id, ip, user-agent and timestamp", async () => {
    state.subscriberResult = { data: { id: "sub-123", email: "user@x.test" }, error: null };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await POST(
      makeReq({
        body: { token: VALID_TOKEN, gdprDelete: true },
        headers: { "x-real-ip": "9.8.7.6", "user-agent": "Mozilla/5.0 Test" },
      }),
    );

    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const logged = logSpy.mock.calls[0]?.[0];
    expect(typeof logged).toBe("string");
    const payload = JSON.parse(logged as string);

    expect(payload.event).toBe("gdpr_erasure");
    expect(payload.subscriberId).toBe("sub-123");
    expect(payload.ip).toBe("9.8.7.6");
    expect(payload.userAgent).toBe("Mozilla/5.0 Test");
    expect(typeof payload.at).toBe("string");
    expect(() => new Date(payload.at).toISOString()).not.toThrow();

    // Privacy invariant: email must NOT appear in the audit log.
    expect(logged).not.toContain("user@x.test");

    logSpy.mockRestore();
  });

  it("does not log when the deletion fails", async () => {
    state.subscriberResult = { data: { id: "sub-123", email: "user@x.test" }, error: null };
    state.deleteError = { message: "DB FATAL" };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await POST(makeReq({ body: { token: VALID_TOKEN, gdprDelete: true } }));

    expect(res.status).toBe(500);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
