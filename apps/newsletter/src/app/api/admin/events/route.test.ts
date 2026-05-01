import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest extends Request {
    private _url: URL;
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
      this._url = new URL(input.toString());
    }
    get nextUrl() {
      return this._url;
    }
  },
}));

const { state } = vi.hoisted(() => ({
  state: {
    session: null as unknown,
    listResponse: {
      data: [] as unknown[] | null,
      count: 0 as number | null,
      error: null as unknown,
    },
    insertResponse: { data: null as unknown, error: null as unknown },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(state.session)),
}));

vi.mock("@/lib/supabase", () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve(state.listResponse)),
    insert: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(state.insertResponse)),
  };
  return {
    getSupabase: () => ({ from: vi.fn(() => builder) }),
  };
});

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  state.session = { user: { email: "admin@blacksheep.test" } };
  state.listResponse = { data: [], count: 0, error: null };
  state.insertResponse = { data: null, error: null };
  const mod = await import("./route");
  GET = mod.GET as unknown as typeof GET;
  POST = mod.POST as unknown as typeof POST;
});

const validBody = {
  slug: "monday-may",
  title: "BLACK SHEEP — Monday May",
  event_date: "2026-05-15T20:00:00Z",
  venue: "11 Clubroom",
};

function makeListReq(query = ""): Request {
  return new Request(`http://localhost:3000/api/admin/events${query}`);
}

function makePostReq(body: object): Request {
  return new Request("http://localhost:3000/api/admin/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/events", () => {
  it("returns 401 without session", async () => {
    state.session = null;
    const res = await GET(makeListReq());
    expect(res.status).toBe(401);
  });

  it("returns paginated events list with default params", async () => {
    state.listResponse = {
      data: [{ id: "11111111-1111-4111-8111-111111111111", slug: "may", status: "published" }],
      count: 1,
      error: null,
    };
    const res = await GET(makeListReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      events: expect.any(Array),
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("accepts ?status=published filter", async () => {
    const res = await GET(makeListReq("?status=published"));
    expect(res.status).toBe(200);
  });

  it("accepts ?q=search filter", async () => {
    const res = await GET(makeListReq("?q=monday"));
    expect(res.status).toBe(200);
  });

  it("returns 500 on supabase error", async () => {
    state.listResponse = { data: null, count: null, error: { message: "FATAL" } };
    const res = await GET(makeListReq());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/events", () => {
  it("returns 401 without session", async () => {
    state.session = null;
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(401);
  });

  it("creates an event and returns 201 + body", async () => {
    state.insertResponse = {
      data: { id: "x", slug: "monday-may", title: validBody.title, status: "draft" },
      error: null,
    };
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.event).toBeDefined();
    expect(body.event.slug).toBe("monday-may");
  });

  it("returns 400 on schema validation fail", async () => {
    const res = await POST(makePostReq({ ...validBody, slug: "INVALID-UPPER" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 on slug duplicate (UNIQUE 23505)", async () => {
    state.insertResponse = { data: null, error: { code: "23505" } };
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(409);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new Request("http://localhost:3000/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
