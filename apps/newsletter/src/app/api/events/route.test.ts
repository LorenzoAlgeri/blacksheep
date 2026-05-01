import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest extends Request {
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
    }
  },
}));

const { mockSupabaseResponse } = vi.hoisted(() => {
  return {
    mockSupabaseResponse: { current: { data: [] as unknown[], error: null as unknown } },
  };
});

vi.mock("@/lib/supabase", () => {
  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    gte: vi.fn(() => queryBuilder),
    order: vi.fn(() => queryBuilder),
    limit: vi.fn(() => Promise.resolve(mockSupabaseResponse.current)),
  };
  return {
    getSupabase: () => ({ from: vi.fn(() => queryBuilder) }),
  };
});

let GET: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  process.env.BLACKSHEEP_LIST_ENABLED = "true";
  mockSupabaseResponse.current = { data: [], error: null };
  const mod = await import("./route");
  GET = mod.GET as unknown as typeof GET;
});

const baseRequest = () => new Request("http://localhost:3000/api/events");

describe("GET /api/events", () => {
  it("returns empty array when no published events exist", async () => {
    const res = await GET(baseRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ events: [] });
  });

  it("returns the events list with minimal shape (no created_by/published_at/created_at)", async () => {
    mockSupabaseResponse.current = {
      data: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          slug: "monday-may",
          title: "BLACK SHEEP — May",
          event_date: "2026-05-15T19:00:00.000Z",
          venue: "11 Clubroom",
          description: "Lista ingresso",
          capacity: 150,
        },
      ],
      error: null,
    };
    const res = await GET(baseRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      id: "55555555-5555-4555-8555-555555555555",
      slug: "monday-may",
      title: "BLACK SHEEP — May",
    });
    expect(body.events[0]).not.toHaveProperty("created_by");
    expect(body.events[0]).not.toHaveProperty("published_at");
    expect(body.events[0]).not.toHaveProperty("created_at");
  });

  it("returns 404 when feature flag is disabled", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "false";
    vi.resetModules();
    const mod = await import("./route");
    const localGET = mod.GET as unknown as typeof GET;
    const res = await localGET(baseRequest());
    expect(res.status).toBe(404);
  });

  it("returns 404 when feature flag env var is unset", async () => {
    delete process.env.BLACKSHEEP_LIST_ENABLED;
    vi.resetModules();
    const mod = await import("./route");
    const localGET = mod.GET as unknown as typeof GET;
    const res = await localGET(baseRequest());
    expect(res.status).toBe(404);
  });

  it("returns 500 on supabase error (and does not leak detail)", async () => {
    mockSupabaseResponse.current = {
      data: null,
      error: { message: "internal db panic", code: "XX000" },
    };
    const res = await GET(baseRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Errore interno");
    // Make sure we don't leak DB details
    expect(JSON.stringify(body)).not.toContain("internal db panic");
    expect(JSON.stringify(body)).not.toContain("XX000");
  });
});
