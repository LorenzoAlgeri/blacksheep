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
    eventResponse: { data: null as unknown, error: null as unknown },
    listResponse: { data: null as unknown, error: null as unknown },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(state.session)),
}));

vi.mock("@/lib/supabase", () => {
  const eventBuilder = {
    select: vi.fn(() => eventBuilder),
    eq: vi.fn(() => eventBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(state.eventResponse)),
  };
  const listBuilder = {
    select: vi.fn(() => listBuilder),
    eq: vi.fn(() => listBuilder),
    order: vi.fn(() => Promise.resolve(state.listResponse)),
  };
  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        if (table === "list_events") return eventBuilder;
        return listBuilder;
      }),
    }),
  };
});

let GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  state.session = { user: { email: "admin@blacksheep.test" } };
  state.eventResponse = { data: { slug: "monday-may" }, error: null };
  state.listResponse = { data: [], error: null };
  const mod = await import("./route");
  GET = mod.GET as unknown as typeof GET;
});

const eventId = "55555555-5555-4555-8555-555555555555";
const ctx = () => ({ params: Promise.resolve({ id: eventId }) });
const req = () =>
  new Request(`http://localhost:3000/api/admin/events/${eventId}/registrations/export.csv`);

describe("GET /api/admin/events/[id]/registrations/export.csv", () => {
  it("returns 401 without session", async () => {
    state.session = null;
    const res = await GET(req(), ctx());
    expect(res.status).toBe(401);
  });

  it("returns 404 when event not found", async () => {
    state.eventResponse = { data: null, error: null };
    const res = await GET(req(), ctx());
    expect(res.status).toBe(404);
  });

  it("returns CSV with correct headers + content-type + content-disposition", async () => {
    state.listResponse = {
      data: [
        {
          registered_at: "2026-05-01T10:00:00Z",
          source: "form",
          subscriber: { email: "user@test.com", name: "Mario", status: "confirmed" },
        },
      ],
      error: null,
    };
    const res = await GET(req(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain(
      'filename="event-monday-may-registrations.csv"',
    );
    const text = await res.text();
    expect(text.split("\n")[0]).toBe("email,name,status,gender,registered_at,source");
    expect(text).toContain("user@test.com,Mario,confirmed,,2026-05-01T10:00:00Z,form");
  });

  it("escapes commas and quotes per RFC 4180", async () => {
    state.listResponse = {
      data: [
        {
          registered_at: "2026-05-01T10:00:00Z",
          source: "form",
          subscriber: {
            email: "user@test.com",
            name: 'Mario "Big" Rossi, Jr.',
            status: "confirmed",
          },
        },
      ],
      error: null,
    };
    const res = await GET(req(), ctx());
    const text = await res.text();
    // The name has both comma and quotes → must be quoted with internal quotes doubled
    expect(text).toContain('"Mario ""Big"" Rossi, Jr."');
  });

  it("returns CSV with header only when no registrations", async () => {
    state.listResponse = { data: [], error: null };
    const res = await GET(req(), ctx());
    const text = await res.text();
    expect(text).toBe("email,name,status,gender,registered_at,source\n");
  });

  it("returns 500 on supabase error", async () => {
    state.listResponse = { data: null, error: { message: "FATAL" } };
    const res = await GET(req(), ctx());
    expect(res.status).toBe(500);
  });
});
