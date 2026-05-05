import { describe, it, expect, vi, beforeEach } from "vitest";

const { state } = vi.hoisted(() => ({
  state: {
    subscriberResult: { data: null as unknown, error: null as unknown },
    updateError: null as unknown,
    updateSpy: null as ReturnType<typeof vi.fn> | null,
  },
}));

vi.mock("@/lib/supabase", () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(state.subscriberResult)),
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updateSpy?.(payload);
      return {
        eq: vi.fn(() => Promise.resolve({ error: state.updateError })),
      };
    }),
  };
  return {
    getSupabase: () => ({ from: vi.fn(() => builder) }),
  };
});

let GET: (req: Request) => Promise<Response>;

const VALID_TOKEN = "11111111-2222-4333-8444-555555555555";

beforeEach(async () => {
  vi.resetModules();
  state.subscriberResult = { data: null, error: null };
  state.updateError = null;
  state.updateSpy = vi.fn();
  const mod = await import("./route");
  GET = mod.GET as unknown as typeof GET;
});

function makeReq(token?: string): Request {
  const url =
    token === undefined
      ? `http://localhost:3000/api/confirm`
      : `http://localhost:3000/api/confirm?token=${token}`;
  const req = new Request(url);
  // Shim NextRequest.nextUrl so the route can read searchParams.
  Object.defineProperty(req, "nextUrl", { value: new URL(url) });
  return req;
}

function locationOf(res: Response): string {
  return res.headers.get("location") ?? "";
}

describe("GET /api/confirm", () => {
  it("redirects to ?error=invalid when token is missing", async () => {
    const res = await GET(makeReq());
    expect(locationOf(res)).toContain("/newsletter/?error=invalid");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("redirects to ?error=invalid when token has wrong format", async () => {
    const res = await GET(makeReq("not-a-uuid"));
    expect(locationOf(res)).toContain("/newsletter/?error=invalid");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("redirects to ?error=invalid when subscriber not found", async () => {
    state.subscriberResult = { data: null, error: null };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/?error=invalid");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("redirects to ?already=true when subscriber is already confirmed", async () => {
    state.subscriberResult = { data: { id: "s1", status: "confirmed" }, error: null };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/confirm?already=true");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("does NOT re-activate a blocked subscriber [SEC-001]", async () => {
    // Regression test: a blocked subscriber must not bypass admin block by
    // clicking a stale confirm link.
    state.subscriberResult = { data: { id: "s1", status: "blocked" }, error: null };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/?error=invalid");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("confirms a pending subscriber and redirects to /newsletter/confirm", async () => {
    state.subscriberResult = { data: { id: "s1", status: "pending" }, error: null };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/confirm");
    expect(locationOf(res)).not.toContain("error=");
    expect(locationOf(res)).not.toContain("already=");
    expect(state.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
  });
});
