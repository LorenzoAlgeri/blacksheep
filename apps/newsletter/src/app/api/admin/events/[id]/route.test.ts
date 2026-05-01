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
    detailResponse: { data: null as unknown, error: null as unknown },
    currentResponse: { data: null as unknown, error: null as unknown },
    updateResponse: { data: null as unknown, error: null as unknown },
    countResponse: { count: 0 as number | null, error: null as unknown },
    deleteResponse: { error: null as unknown },
    softUpdateResponse: { data: null as unknown, error: null as unknown },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(state.session)),
}));

vi.mock("@/lib/supabase", () => {
  let stage = "detail"; // detail | current | update | count | delete | softUpdate
  const builder = {
    select: vi.fn((_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) stage = "count";
      return builder;
    }),
    eq: vi.fn(() => builder),
    update: vi.fn(() => {
      stage = "update";
      return builder;
    }),
    delete: vi.fn(() => {
      stage = "delete";
      return builder;
    }),
    maybeSingle: vi.fn(() => {
      const resp =
        stage === "current"
          ? state.currentResponse
          : stage === "softUpdate"
            ? state.softUpdateResponse
            : state.detailResponse;
      stage = "detail";
      return Promise.resolve(resp);
    }),
    single: vi.fn(() => Promise.resolve(state.updateResponse)),
    then: undefined,
    // For .delete().eq() final await
  };
  // Make builder return a thenable when used at end of chain (.delete().eq())
  const wrappedBuilder: Record<string, unknown> = builder;
  wrappedBuilder.then = (
    onFulfilled: (v: { error: unknown; count?: number | null }) => unknown,
  ) => {
    if (stage === "count") {
      stage = "detail";
      return Promise.resolve(state.countResponse).then(onFulfilled);
    }
    if (stage === "delete") {
      stage = "detail";
      return Promise.resolve(state.deleteResponse).then(onFulfilled);
    }
    return Promise.resolve({ error: null }).then(onFulfilled);
  };
  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        if (table === "list_event_registrations") stage = "count";
        else if (table === "list_events") stage = "detail";
        return builder;
      }),
    }),
  };
});

let GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let PATCH: typeof GET;
let DELETE: typeof GET;

beforeEach(async () => {
  vi.resetModules();
  state.session = { user: { email: "admin@blacksheep.test" } };
  state.detailResponse = { data: null, error: null };
  state.currentResponse = { data: null, error: null };
  state.updateResponse = { data: null, error: null };
  state.countResponse = { count: 0, error: null };
  state.deleteResponse = { error: null };
  state.softUpdateResponse = { data: null, error: null };
  const mod = await import("./route");
  GET = mod.GET as unknown as typeof GET;
  PATCH = mod.PATCH as unknown as typeof PATCH;
  DELETE = mod.DELETE as unknown as typeof DELETE;
});

const eventId = "55555555-5555-4555-8555-555555555555";
const ctx = { params: Promise.resolve({ id: eventId }) };

function makeReq(opts?: { method?: string; body?: object; query?: string }): Request {
  return new Request(`http://localhost:3000/api/admin/events/${eventId}${opts?.query ?? ""}`, {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
}

describe("GET /api/admin/events/[id]", () => {
  it("returns 401 without session", async () => {
    state.session = null;
    const res = await GET(makeReq(), { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when event not found", async () => {
    state.detailResponse = { data: null, error: null };
    const res = await GET(makeReq(), { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with event detail", async () => {
    state.detailResponse = { data: { id: eventId, slug: "ev", status: "draft" }, error: null };
    const res = await GET(makeReq(), { params: Promise.resolve({ id: eventId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.id).toBe(eventId);
  });
});

describe("PATCH /api/admin/events/[id]", () => {
  it("returns 401 without session", async () => {
    state.session = null;
    const res = await PATCH(makeReq({ method: "PATCH", body: { title: "X" } }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const res = await PATCH(makeReq({ method: "PATCH", body: { slug: "INVALID UPPER" } }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when event not found (current lookup)", async () => {
    state.currentResponse = { data: null, error: null };
    state.detailResponse = { data: null, error: null };
    const res = await PATCH(makeReq({ method: "PATCH", body: { title: "New Title" } }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(404);
  });

  it("updates and returns 200 with new event", async () => {
    state.currentResponse = { data: { status: "draft", published_at: null }, error: null };
    state.detailResponse = { data: { status: "draft", published_at: null }, error: null };
    state.updateResponse = {
      data: { id: eventId, title: "Updated", status: "draft" },
      error: null,
    };
    const res = await PATCH(makeReq({ method: "PATCH", body: { title: "Updated" } }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.title).toBe("Updated");
  });

  it("returns 409 on slug duplicate", async () => {
    state.currentResponse = { data: { status: "draft", published_at: null }, error: null };
    state.detailResponse = { data: { status: "draft", published_at: null }, error: null };
    state.updateResponse = { data: null, error: { code: "23505" } };
    const res = await PATCH(makeReq({ method: "PATCH", body: { slug: "duplicate-slug" } }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/admin/events/[id]", () => {
  it("returns 401 without session", async () => {
    state.session = null;
    const res = await DELETE(makeReq({ method: "DELETE" }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(401);
  });

  it("soft archives by default and returns 204", async () => {
    state.softUpdateResponse = { data: { id: eventId }, error: null };
    state.detailResponse = { data: { id: eventId }, error: null };
    const res = await DELETE(makeReq({ method: "DELETE" }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(204);
  });

  it("returns 404 on soft archive when event not found", async () => {
    state.softUpdateResponse = { data: null, error: null };
    state.detailResponse = { data: null, error: null };
    const res = await DELETE(makeReq({ method: "DELETE" }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 on hard delete when registrations exist", async () => {
    state.countResponse = { count: 3, error: null };
    const res = await DELETE(makeReq({ method: "DELETE", query: "?hard=1" }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 204 on hard delete when no registrations", async () => {
    state.countResponse = { count: 0, error: null };
    state.deleteResponse = { error: null };
    const res = await DELETE(makeReq({ method: "DELETE", query: "?hard=1" }), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(res.status).toBe(204);
  });
});
