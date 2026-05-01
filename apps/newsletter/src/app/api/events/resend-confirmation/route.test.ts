import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest extends Request {
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
    }
  },
}));

const { state } = vi.hoisted(() => ({
  state: {
    subscriberResponse: { data: null as unknown },
    siteConfigResponse: { data: null as unknown },
    sendResponse: { error: null as unknown },
    sendCalls: [] as unknown[],
  },
}));

vi.mock("@/lib/supabase", () => {
  const subscriberBuilder = {
    select: vi.fn(() => subscriberBuilder),
    eq: vi.fn(() => subscriberBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(state.subscriberResponse)),
    single: vi.fn(() => Promise.resolve(state.siteConfigResponse)),
  };
  return {
    getSupabase: () => ({
      from: vi.fn(() => subscriberBuilder),
    }),
  };
});

vi.mock("@/lib/resend", () => ({
  getResend: () => ({
    emails: {
      send: vi.fn((args: unknown) => {
        state.sendCalls.push(args);
        return Promise.resolve(state.sendResponse);
      }),
    },
  }),
}));

let POST: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  process.env.BLACKSHEEP_LIST_ENABLED = "true";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  state.subscriberResponse = { data: null };
  state.siteConfigResponse = { data: null };
  state.sendResponse = { error: null };
  state.sendCalls = [];
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
});

function makeRequest(body: object, ip = "127.0.0.1", email?: string): Request {
  return new Request("http://localhost:3000/api/events/resend-confirmation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events/resend-confirmation", () => {
  it("re-sends email for a pending subscriber", async () => {
    state.subscriberResponse = {
      data: { id: "x", name: "Mario", status: "pending", token: "t-pending" },
    };
    const res = await POST(makeRequest({ email: "pending-1@test.com" }, "10.0.0.1"));
    expect(res.status).toBe(200);
    expect(state.sendCalls).toHaveLength(1);
  });

  it("returns 200 silent (no email) for confirmed subscriber", async () => {
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "confirmed", token: "t" },
    };
    const res = await POST(makeRequest({ email: "confirmed-1@test.com" }, "10.0.0.2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 200 silent for unsubscribed subscriber", async () => {
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "unsubscribed", token: "t" },
    };
    const res = await POST(makeRequest({ email: "unsub-1@test.com" }, "10.0.0.3"));
    expect(res.status).toBe(200);
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 200 silent for blocked subscriber", async () => {
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "blocked", token: "t" },
    };
    const res = await POST(makeRequest({ email: "blocked-1@test.com" }, "10.0.0.4"));
    expect(res.status).toBe(200);
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 200 silent for non-existent email", async () => {
    state.subscriberResponse = { data: null };
    const res = await POST(makeRequest({ email: "ghost-1@test.com" }, "10.0.0.5"));
    expect(res.status).toBe(200);
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 429 when IP rate limit hit", async () => {
    state.subscriberResponse = { data: null };
    const ip = "ratelimit-ip-" + Math.random();
    for (let i = 0; i < 3; i++) {
      const r = await POST(makeRequest({ email: `u${i}@test.com` }, ip));
      expect(r.status).toBe(200);
    }
    const r = await POST(makeRequest({ email: `u4@test.com` }, ip));
    expect(r.status).toBe(429);
  });

  it("returns 429 when email rate limit hit", async () => {
    state.subscriberResponse = { data: null };
    const email = `same-${Math.random()}@test.com`;
    const r1 = await POST(makeRequest({ email }, "11.0.0.1"));
    expect(r1.status).toBe(200);
    const r2 = await POST(makeRequest({ email }, "11.0.0.2"));
    expect(r2.status).toBe(429);
  });

  it("returns 400 on invalid email", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }, "10.0.0.6"));
    expect(res.status).toBe(400);
  });

  it("returns 403 when origin not allowed", async () => {
    const req = new Request("http://localhost:3000/api/events/resend-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.7",
        origin: "https://attacker.example",
      },
      body: JSON.stringify({ email: "user@test.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when feature flag is disabled", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "false";
    vi.resetModules();
    const mod = await import("./route");
    const localPOST = mod.POST as unknown as typeof POST;
    const res = await localPOST(makeRequest({ email: "u@test.com" }, "10.0.0.8"));
    expect(res.status).toBe(404);
  });
});
