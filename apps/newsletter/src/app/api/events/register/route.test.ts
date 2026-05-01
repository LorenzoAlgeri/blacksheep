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
    eventResponse: { data: null as unknown, error: null as unknown },
    subscriberResponse: { data: null as unknown, error: null as unknown },
    insertResponse: { error: null as unknown },
    sendResponse: { error: null as unknown },
    sendCalls: [] as unknown[],
  },
}));

vi.mock("@/lib/supabase", () => {
  const eventBuilder = {
    select: vi.fn(() => eventBuilder),
    eq: vi.fn(() => eventBuilder),
    single: vi.fn(() => Promise.resolve(state.eventResponse)),
  };
  const subscriberBuilder = {
    select: vi.fn(() => subscriberBuilder),
    eq: vi.fn(() => subscriberBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(state.subscriberResponse)),
  };
  const insertBuilder = {
    insert: vi.fn(() => Promise.resolve(state.insertResponse)),
  };
  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        if (table === "list_events") return eventBuilder;
        if (table === "subscribers") return subscriberBuilder;
        if (table === "list_event_registrations") return insertBuilder;
        throw new Error(`Unexpected table: ${table}`);
      }),
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
  process.env.NODE_ENV = "test";
  state.eventResponse = { data: null, error: null };
  state.subscriberResponse = { data: null, error: null };
  state.insertResponse = { error: null };
  state.sendResponse = { error: null };
  state.sendCalls = [];
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
});

const validEvent = {
  id: "55555555-5555-4555-8555-555555555555",
  title: "BLACK SHEEP Night",
  event_date: "2026-05-15T19:00:00.000Z",
  venue: "11 Clubroom",
  description: "Lista ingresso",
  status: "published",
};

const validBody = {
  eventId: validEvent.id,
  email: "user@example.com",
  emailConfirmation: "user@example.com",
  website: "",
};

function makeRequest(body: object, ip = "127.0.0.1"): Request {
  return new Request("http://localhost:3000/api/events/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events/register", () => {
  it("registers a confirmed subscriber and sends an email (status: registered)", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Mario",
        status: "confirmed",
        token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "1.1.1.1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      status: "registered",
      eventTitle: validEvent.title,
      eventDate: validEvent.event_date,
    });
    expect(state.sendCalls).toHaveLength(1);
  });

  it("returns pending_subscriber and DOES NOT send email", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "pending", token: "t" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "1.1.1.2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending_subscriber");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns no_subscriber when email not in DB and DOES NOT send email", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = { data: null, error: null };
    const res = await POST(makeRequest(validBody, "1.1.1.3"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("no_subscriber");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns no_subscriber for blocked subscribers (anti-enumeration)", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "blocked", token: "t" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "1.1.1.4"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("no_subscriber");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns no_subscriber for unsubscribed (no leak of unsubscribed state)", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "unsubscribed", token: "t" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "1.1.1.10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("no_subscriber");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns already_registered on UNIQUE violation 23505", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: { id: "x", name: "M", status: "confirmed", token: "t" },
      error: null,
    };
    state.insertResponse = {
      error: { message: "duplicate key", code: "23505" },
    };
    const res = await POST(makeRequest(validBody, "1.1.1.5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("already_registered");
    expect(body.eventTitle).toBe(validEvent.title);
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 404 when event not found", async () => {
    state.eventResponse = { data: null, error: { code: "PGRST116" } };
    const res = await POST(makeRequest(validBody, "1.1.1.6"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when event is not published", async () => {
    state.eventResponse = { data: { ...validEvent, status: "draft" }, error: null };
    const res = await POST(makeRequest(validBody, "1.1.1.7"));
    expect(res.status).toBe(404);
  });

  it("returns 200 silent on honeypot trigger (no real registration)", async () => {
    const res = await POST(makeRequest({ ...validBody, website: "http://spam.test" }, "1.1.1.8"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("registered");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns 429 after rate limit hit", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = { data: null, error: null };
    const ip = "rate-test-" + Math.random();
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest(validBody, ip));
      expect(res.status).toBe(200);
    }
    const res = await POST(makeRequest(validBody, ip));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email and emailConfirmation differ", async () => {
    const res = await POST(
      makeRequest({ ...validBody, emailConfirmation: "other@example.com" }, "2.2.2.1"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on malformed JSON body", async () => {
    const req = new Request("http://localhost:3000/api/events/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "2.2.2.3",
        origin: "http://localhost:3000",
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when origin is not allowed", async () => {
    const req = new Request("http://localhost:3000/api/events/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "2.2.2.4",
        origin: "https://attacker.example",
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when feature flag is disabled", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "false";
    vi.resetModules();
    const mod = await import("./route");
    const localPOST = mod.POST as unknown as typeof POST;
    const res = await localPOST(makeRequest(validBody, "2.2.2.5"));
    expect(res.status).toBe(404);
  });
});
