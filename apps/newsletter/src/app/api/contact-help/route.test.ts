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
    insertResponse: { error: null as unknown },
    sendResponse: { error: null as unknown },
    insertCalls: [] as unknown[],
    sendCalls: [] as unknown[],
  },
}));

vi.mock("@/lib/supabase", () => {
  const builder = {
    insert: vi.fn((args: unknown) => {
      state.insertCalls.push(args);
      return Promise.resolve(state.insertResponse);
    }),
  };
  return {
    getSupabase: () => ({ from: vi.fn(() => builder) }),
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
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  state.insertResponse = { error: null };
  state.sendResponse = { error: null };
  state.insertCalls = [];
  state.sendCalls = [];
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
});

const validBody = {
  email: "user@example.com",
  phone: "+39 333 1234567",
  name: "Mario Rossi",
  message: "Aiuto, non trovo email di conferma",
};

function makeRequest(body: object, ip = "127.0.0.1"): Request {
  return new Request("http://localhost:3000/api/contact-help", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact-help", () => {
  it("inserts in DB + sends email to both founder addresses on valid form", async () => {
    const res = await POST(makeRequest(validBody, "1.1.1.1"));
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.sendCalls).toHaveLength(1);
    const sent = state.sendCalls[0] as { to: string[] };
    expect(sent.to).toEqual(["info@lorenzoalgeri.it", "the.blacksheep.night@gmail.com"]);
  });

  it("uses user email as replyTo on outgoing message", async () => {
    await POST(makeRequest(validBody, "1.1.1.2"));
    const sent = state.sendCalls[0] as { replyTo: string };
    expect(sent.replyTo).toBe(validBody.email);
  });

  it("silently accepts honeypot trigger (no insert, no email)", async () => {
    const res = await POST(makeRequest({ ...validBody, website: "http://spam.test" }, "1.1.1.3"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(state.insertCalls).toHaveLength(0);
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 429 after rate limit hit", async () => {
    const ip = "rate-test-" + Math.random();
    for (let i = 0; i < 3; i++) {
      const r = await POST(makeRequest(validBody, ip));
      expect(r.status).toBe(200);
    }
    const r = await POST(makeRequest(validBody, ip));
    expect(r.status).toBe(429);
  });

  it("returns 400 when phone too short", async () => {
    const res = await POST(makeRequest({ ...validBody, phone: "123" }, "1.1.1.4"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "not-an-email" }, "1.1.1.5"));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB insert error (no leak)", async () => {
    state.insertResponse = { error: { message: "FATAL", code: "XX000" } };
    const res = await POST(makeRequest(validBody, "1.1.1.6"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("FATAL");
    expect(JSON.stringify(body)).not.toContain("XX000");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 500 on Resend error but DB insert is committed (audit preserved)", async () => {
    state.sendResponse = { error: { message: "API down" } };
    const res = await POST(makeRequest(validBody, "1.1.1.7"));
    expect(res.status).toBe(500);
    expect(state.insertCalls).toHaveLength(1); // DB row STILL inserted
    expect(state.sendCalls).toHaveLength(1); // attempted but failed
  });

  it("returns 403 when origin not allowed", async () => {
    const req = new Request("http://localhost:3000/api/contact-help", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.1.1.8",
        origin: "https://attacker.example",
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("accepts submission with omitted message", async () => {
    const { message: _m, ...withoutMessage } = validBody;
    const res = await POST(makeRequest(withoutMessage, "1.1.1.9"));
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
  });
});
