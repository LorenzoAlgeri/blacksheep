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
    eventResponse: { data: null as unknown },
    insertResponse: { error: null as unknown },
  },
}));

vi.mock("@/lib/supabase", () => {
  const subscriberBuilder = {
    select: vi.fn(() => subscriberBuilder),
    eq: vi.fn(() => subscriberBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(state.subscriberResponse)),
  };
  const eventBuilder = {
    select: vi.fn(() => eventBuilder),
    eq: vi.fn(() => eventBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(state.eventResponse)),
  };
  const insertBuilder = {
    insert: vi.fn(() => Promise.resolve(state.insertResponse)),
  };
  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        if (table === "subscribers") return subscriberBuilder;
        if (table === "list_events") return eventBuilder;
        if (table === "list_event_registrations") return insertBuilder;
        throw new Error(`Unexpected table: ${table}`);
      }),
    }),
  };
});

let GET: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  process.env.BLACKSHEEP_LIST_ENABLED = "true";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  state.subscriberResponse = { data: null };
  state.eventResponse = { data: null };
  state.insertResponse = { error: null };
  const mod = await import("./route");
  GET = mod.GET as unknown as typeof GET;
});

const VALID_TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VALID_SLUG = "monday-club-night-may";

function makeRequest(token: string, slug: string): Request {
  return new Request(
    `http://localhost:3000/api/events/register-from-email?token=${token}&event_slug=${slug}`,
  );
}

describe("GET /api/events/register-from-email", () => {
  it("inserts registration and redirects to status=ok on confirmed token + published event", async () => {
    state.subscriberResponse = { data: { id: "sub-1", status: "confirmed" } };
    state.eventResponse = { data: { id: "evt-1", status: "published" } };
    const res = await GET(makeRequest(VALID_TOKEN, VALID_SLUG));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain(`/${VALID_SLUG}/registered?status=ok`);
  });

  it("redirects to status=already on UNIQUE violation 23505", async () => {
    state.subscriberResponse = { data: { id: "sub-1", status: "confirmed" } };
    state.eventResponse = { data: { id: "evt-1", status: "published" } };
    state.insertResponse = { error: { code: "23505" } };
    const res = await GET(makeRequest(VALID_TOKEN, VALID_SLUG));
    expect(res.headers.get("location")).toContain("status=already");
  });

  it("redirects to status=invalid when token belongs to pending subscriber", async () => {
    state.subscriberResponse = { data: { id: "sub-1", status: "pending" } };
    state.eventResponse = { data: { id: "evt-1", status: "published" } };
    const res = await GET(makeRequest(VALID_TOKEN, VALID_SLUG));
    expect(res.headers.get("location")).toContain("status=invalid");
  });

  it("redirects to status=invalid when token does not exist", async () => {
    state.subscriberResponse = { data: null };
    const res = await GET(makeRequest(VALID_TOKEN, VALID_SLUG));
    expect(res.headers.get("location")).toContain("status=invalid");
  });

  it("redirects to status=invalid when token format is malformed", async () => {
    const res = await GET(makeRequest("not-a-uuid", VALID_SLUG));
    expect(res.headers.get("location")).toContain("status=invalid");
  });

  it("redirects to status=event_unavailable when event is not published", async () => {
    state.subscriberResponse = { data: { id: "sub-1", status: "confirmed" } };
    state.eventResponse = { data: { id: "evt-1", status: "draft" } };
    const res = await GET(makeRequest(VALID_TOKEN, VALID_SLUG));
    expect(res.headers.get("location")).toContain("status=event_unavailable");
  });

  it("redirects to status=event_unavailable when event does not exist", async () => {
    state.subscriberResponse = { data: { id: "sub-1", status: "confirmed" } };
    state.eventResponse = { data: null };
    const res = await GET(makeRequest(VALID_TOKEN, VALID_SLUG));
    expect(res.headers.get("location")).toContain("status=event_unavailable");
  });

  it("returns 404 when feature flag is off", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "false";
    vi.resetModules();
    const mod = await import("./route");
    const localGET = mod.GET as unknown as typeof GET;
    const res = await localGET(makeRequest(VALID_TOKEN, VALID_SLUG));
    expect(res.status).toBe(404);
  });
});
