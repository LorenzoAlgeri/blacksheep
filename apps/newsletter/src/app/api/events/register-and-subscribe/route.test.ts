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
    subscriberUpdateResponse: { error: null as unknown },
    upsertResponse: { data: null as unknown, error: null as unknown },
    intentInsertResponse: { error: null as unknown },
    registrationInsertResponse: { error: null as unknown },
    siteConfigResponse: { data: null as unknown, error: null as unknown },
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
  const subscriberUpdateBuilder = {
    eq: vi.fn(() => Promise.resolve(state.subscriberUpdateResponse)),
  };
  const subscriberSelectBuilder = {
    select: vi.fn(() => subscriberSelectBuilder),
    eq: vi.fn(() => subscriberSelectBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(state.subscriberResponse)),
  };
  const subscriberUpsertBuilder = {
    select: vi.fn(() => subscriberUpsertBuilder),
    single: vi.fn(() => Promise.resolve(state.upsertResponse)),
  };
  const subscriberBuilder = {
    select: vi.fn(() => subscriberSelectBuilder),
    update: vi.fn(() => subscriberUpdateBuilder),
    eq: vi.fn(() => subscriberSelectBuilder),
    upsert: vi.fn(() => subscriberUpsertBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(state.subscriberResponse)),
  };
  const intentInsertBuilder = {
    insert: vi.fn(() => Promise.resolve(state.intentInsertResponse)),
  };
  const registrationInsertBuilder = {
    insert: vi.fn(() => Promise.resolve(state.registrationInsertResponse)),
  };
  const siteConfigBuilder = {
    select: vi.fn(() => siteConfigBuilder),
    eq: vi.fn(() => siteConfigBuilder),
    single: vi.fn(() => Promise.resolve(state.siteConfigResponse)),
  };
  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        if (table === "list_events") return eventBuilder;
        if (table === "subscribers") return subscriberBuilder;
        if (table === "pending_event_intents") return intentInsertBuilder;
        if (table === "list_event_registrations") return registrationInsertBuilder;
        if (table === "site_config") return siteConfigBuilder;
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
  vi.stubEnv("NODE_ENV", "test");
  state.eventResponse = { data: null, error: null };
  state.subscriberResponse = { data: null, error: null };
  state.subscriberUpdateResponse = { error: null };
  state.upsertResponse = { data: null, error: null };
  state.intentInsertResponse = { error: null };
  state.registrationInsertResponse = { error: null };
  state.siteConfigResponse = {
    data: { tagline: "EVERY MONDAY", venue: "11 Clubroom" },
    error: null,
  };
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
  registration_deadline: null,
};

const validBody = {
  eventId: validEvent.id,
  email: "newuser@example.com",
  name: "Mario",
  gender: "male" as const,
  consentVersion: "v1.0" as const,
  website: "",
};

function makeRequest(body: object, ip = "127.0.0.1"): Request {
  return new Request("http://localhost:3000/api/events/register-and-subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events/register-and-subscribe", () => {
  it("returns 404 when BLACKSHEEP_LIST_ENABLED is not true", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "false";
    vi.resetModules();
    const mod = await import("./route");
    const localPOST = mod.POST as unknown as typeof POST;
    const res = await localPOST(makeRequest(validBody, "10.0.0.1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when origin is not allowed", async () => {
    const req = new Request("http://localhost:3000/api/events/register-and-subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.2",
        origin: "https://attacker.example",
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = { data: null, error: null };
    state.upsertResponse = {
      data: { token: "tok-" },
      error: null,
    };
    const ip = "rate-test-" + Math.random();
    // rateLimitRegisterAndSubscribe allows 3 per minute
    for (let i = 0; i < 3; i++) {
      const res = await POST(makeRequest(validBody, ip));
      expect(res.status).toBe(200);
    }
    const res = await POST(makeRequest(validBody, ip));
    expect(res.status).toBe(429);
  });

  it("returns 400 on malformed JSON body", async () => {
    const req = new Request("http://localhost:3000/api/events/register-and-subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.3",
        origin: "http://localhost:3000",
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid body (missing required fields)", async () => {
    const res = await POST(makeRequest({ email: "bad" }, "10.0.0.4"));
    expect(res.status).toBe(400);
  });

  it("silently accepts honeypot submissions with pending_confirmation", async () => {
    const res = await POST(makeRequest({ ...validBody, website: "http://spam.test" }, "10.0.0.5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending_confirmation");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns pending_confirmation for new subscriber (no existing record)", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = { data: null, error: null };
    state.upsertResponse = {
      data: { token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "10.0.0.6"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending_confirmation");
    expect(state.sendCalls).toHaveLength(1);
  });

  it("returns no_subscriber for blocked subscriber (anti-enumeration)", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "blocked", token: "t", gender: "male" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "10.0.0.7"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("no_subscriber");
    expect(state.sendCalls).toHaveLength(0);
  });

  it("returns registered for already-confirmed subscriber with gender", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Mario",
        status: "confirmed",
        token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        gender: "male",
      },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "10.0.0.8"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("registered");
    expect(body.eventTitle).toBe(validEvent.title);
    expect(body.eventDate).toBe(validEvent.event_date);
    expect(state.sendCalls).toHaveLength(1);
  });

  it("updates gender and registers for confirmed subscriber with null gender", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Maria",
        status: "confirmed",
        token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        gender: null,
      },
      error: null,
    };
    // registerAndSubscribeSchema requires gender, so confirmed subscribers
    // without gender get updated atomically and registered directly
    const res = await POST(makeRequest(validBody, "10.0.0.9"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("registered");
    expect(body.eventTitle).toBe(validEvent.title);
    expect(state.sendCalls).toHaveLength(1);
  });

  it("returns pending_confirmation for pending subscriber (re-upsert)", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "pending", token: "t", gender: "female" },
      error: null,
    };
    state.upsertResponse = {
      data: { token: "new-token" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "10.0.0.10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending_confirmation");
    expect(state.sendCalls).toHaveLength(1);
  });

  it("returns pending_confirmation for unsubscribed subscriber (re-upsert)", async () => {
    state.eventResponse = { data: validEvent, error: null };
    state.subscriberResponse = {
      data: { id: "x", name: null, status: "unsubscribed", token: "t", gender: "male" },
      error: null,
    };
    state.upsertResponse = {
      data: { token: "new-token" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "10.0.0.11"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending_confirmation");
    expect(state.sendCalls).toHaveLength(1);
  });

  it("returns 404 when event not found", async () => {
    state.eventResponse = { data: null, error: { code: "PGRST116" } };
    const res = await POST(makeRequest(validBody, "10.0.0.12"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when event is not published", async () => {
    state.eventResponse = {
      data: { ...validEvent, status: "draft" },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "10.0.0.13"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when registration deadline has passed", async () => {
    state.eventResponse = {
      data: {
        ...validEvent,
        registration_deadline: "2020-01-01T00:00:00.000Z",
      },
      error: null,
    };
    const res = await POST(makeRequest(validBody, "10.0.0.14"));
    expect(res.status).toBe(403);
  });
});
