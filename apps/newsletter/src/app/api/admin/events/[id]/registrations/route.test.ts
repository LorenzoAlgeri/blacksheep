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
    session: null as unknown,
    listResponse: {
      data: null as unknown,
      count: 0 as number | null,
      error: null as unknown,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(state.session)),
}));

vi.mock("@/lib/supabase", () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve(state.listResponse)),
  };
  return {
    getSupabase: () => ({ from: vi.fn(() => builder) }),
  };
});

let GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  state.session = { user: { email: "admin@blacksheep.test" } };
  state.listResponse = { data: [], count: 0, error: null };
  const mod = await import("./route");
  GET = mod.GET as unknown as typeof GET;
});

const eventId = "55555555-5555-4555-8555-555555555555";

function makeReq(query = ""): Request {
  return new Request(`http://localhost:3000/api/admin/events/${eventId}/registrations${query}`);
}

const ctx = () => ({ params: Promise.resolve({ id: eventId }) });

describe("GET /api/admin/events/[id]/registrations", () => {
  it("returns 401 without session", async () => {
    state.session = null;
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(401);
  });

  it("returns paginated registrations list", async () => {
    state.listResponse = {
      data: [
        {
          id: "r1",
          registered_at: "2026-05-01T10:00:00Z",
          source: "form",
          subscriber: { id: "s1", email: "a@test", name: "A", status: "confirmed" },
        },
      ],
      count: 1,
      error: null,
    };
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.registrations).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("accepts ?q=search filter", async () => {
    const res = await GET(makeReq("?q=mario"), ctx());
    expect(res.status).toBe(200);
  });

  it("returns 500 on supabase error", async () => {
    state.listResponse = { data: null, count: null, error: { message: "FATAL" } };
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(500);
  });
});
