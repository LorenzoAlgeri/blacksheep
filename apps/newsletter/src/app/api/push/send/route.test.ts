import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted state
// ---------------------------------------------------------------------------
const { state } = vi.hoisted(() => ({
  state: {
    subscriptions: [] as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
    fetchError: null as unknown,
    sendNotificationError: null as unknown,
    deletedIds: [] as string[],
    updatedIds: [] as string[],
    isAuthed: true,
  },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(state.isAuthed ? { user: { email: "admin@test.com" } } : null)),
}));

vi.mock("@/lib/supabase", () => {
  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        if (table === "push_subscriptions") {
          return {
            select: vi.fn(() =>
              Promise.resolve({
                data: state.fetchError ? null : state.subscriptions,
                error: state.fetchError ?? null,
              }),
            ),
            delete: vi.fn(() => ({
              in: vi.fn((_col: string, ids: string[]) => {
                state.deletedIds.push(...ids);
                return Promise.resolve({ error: null });
              }),
            })),
            update: vi.fn(() => ({
              in: vi.fn((_col: string, ids: string[]) => {
                state.updatedIds.push(...ids);
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
      }),
    }),
  };
});

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(() => {
      if (state.sendNotificationError) {
        throw state.sendNotificationError;
      }
      return Promise.resolve({ statusCode: 201 });
    }),
  },
}));

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
beforeEach(async () => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
  process.env.VAPID_PRIVATE_KEY = "test-private-key";
  process.env.VAPID_SUBJECT = "mailto:test@test.com";
  state.subscriptions = [];
  state.fetchError = null;
  state.sendNotificationError = null;
  state.deletedIds = [];
  state.updatedIds = [];
  state.isAuthed = true;
});

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------
async function getPOST() {
  const mod = await import("./route");
  return mod.POST as unknown as (req: Request) => Promise<Response>;
}

function makeReq(body: Record<string, unknown> = {}): Request {
  const defaultBody = {
    title: "Test Notification",
    body: "Test body",
    ...body,
  };
  return new Request("http://localhost:3000/api/push/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(defaultBody),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/push/send", () => {
  it("returns 401 when not authenticated", async () => {
    state.isAuthed = false;
    const POST = await getPOST();
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const POST = await getPOST();
    const res = await POST(
      new Request("http://localhost:3000/api/push/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is missing", async () => {
    const POST = await getPOST();
    const res = await POST(makeReq({ title: "" }));
    expect(res.status).toBe(400);
  });

  it("returns { sent: 0, failed: 0, cleaned: 0 } when no subscriptions exist", async () => {
    state.subscriptions = [];
    const POST = await getPOST();
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ sent: 0, failed: 0, cleaned: 0 });
  });

  it("returns 500 on database fetch error", async () => {
    state.fetchError = { message: "db error", code: "XX000" };
    const POST = await getPOST();
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });

  it("sends notifications and reports count", async () => {
    state.subscriptions = [
      { id: "sub-1", endpoint: "https://push.example.com/1", p256dh: "key1", auth: "auth1" },
      { id: "sub-2", endpoint: "https://push.example.com/2", p256dh: "key2", auth: "auth2" },
    ];
    const POST = await getPOST();
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.sent).toBe(2);
    expect(json.failed).toBe(0);
  });

  it("cleans up 410 Gone subscriptions", async () => {
    state.subscriptions = [
      { id: "sub-expired", endpoint: "https://push.example.com/expired", p256dh: "k", auth: "a" },
    ];
    state.sendNotificationError = { statusCode: 410, message: "Gone" };
    const POST = await getPOST();
    const res = await POST(makeReq());
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.cleaned).toBe(1);
    expect(json.sent).toBe(0);
    expect(state.deletedIds).toContain("sub-expired");
  });

  it("handles 404 expired subscription same as 410", async () => {
    state.subscriptions = [
      { id: "sub-404", endpoint: "https://push.example.com/404", p256dh: "k", auth: "a" },
    ];
    state.sendNotificationError = { statusCode: 404, message: "Not Found" };
    const POST = await getPOST();
    const res = await POST(makeReq());
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.cleaned).toBe(1);
  });
});
