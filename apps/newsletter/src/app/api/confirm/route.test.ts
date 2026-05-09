import { describe, it, expect, vi, beforeEach } from "vitest";

type UpdateSpy = ((payload: Record<string, unknown>) => void) & {
  mock: { calls: unknown[][] };
};

const { state } = vi.hoisted(() => ({
  state: {
    subscriberResult: { data: null as unknown, error: null as unknown },
    updateError: null as unknown,
    updateSpy: null as UpdateSpy | null,
    /** Rows returned by pending_event_intents SELECT */
    intentsResult: { data: [] as unknown[] | null, error: null as unknown },
    /** Rows returned by list_events SELECT for intent processing */
    eventResults: [] as Array<{ data: unknown; error: unknown }>,
    eventResultIndex: 0,
    /** Tracks insert calls into list_event_registrations */
    registrationInsertCalls: [] as unknown[],
    registrationInsertError: null as unknown,
    /** Tracks delete calls on pending_event_intents */
    intentsDeleteCalled: false,
    /** Email send tracking */
    sendCalls: [] as unknown[],
    sendError: null as unknown,
  },
}));

vi.mock("@/lib/supabase", () => {
  const subscriberBuilder = {
    select: vi.fn(() => subscriberBuilder),
    eq: vi.fn(() => subscriberBuilder),
    single: vi.fn(() => Promise.resolve(state.subscriberResult)),
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updateSpy?.(payload);
      return {
        eq: vi.fn(() => Promise.resolve({ error: state.updateError })),
      };
    }),
  };

  const intentsSelectBuilder = {
    select: vi.fn(() => intentsSelectBuilder),
    eq: vi.fn(() => Promise.resolve(state.intentsResult)),
  };

  const intentsDeleteBuilder = {
    eq: vi.fn(() => {
      state.intentsDeleteCalled = true;
      return Promise.resolve({ error: null });
    }),
  };

  const eventBuilder = {
    select: vi.fn(() => eventBuilder),
    eq: vi.fn(() => eventBuilder),
    single: vi.fn(() => {
      const idx = state.eventResultIndex;
      state.eventResultIndex = idx + 1;
      return Promise.resolve(state.eventResults[idx] ?? { data: null, error: null });
    }),
  };

  const registrationInsertBuilder = {
    insert: vi.fn((row: unknown) => {
      state.registrationInsertCalls.push(row);
      return Promise.resolve({ error: state.registrationInsertError });
    }),
  };

  return {
    getSupabase: () => ({
      from: vi.fn((table: string) => {
        if (table === "subscribers") return subscriberBuilder;
        if (table === "pending_event_intents") {
          // Return a builder that supports both select(...) and delete()
          return {
            select: intentsSelectBuilder.select,
            delete: vi.fn(() => intentsDeleteBuilder),
          };
        }
        if (table === "list_events") return eventBuilder;
        if (table === "list_event_registrations") return registrationInsertBuilder;
        throw new Error(`Unexpected table in mock: ${table}`);
      }),
    }),
  };
});

vi.mock("@/lib/resend", () => ({
  getResend: () => ({
    emails: {
      send: vi.fn((args: unknown) => {
        state.sendCalls.push(args);
        return Promise.resolve({ error: state.sendError });
      }),
    },
  }),
}));

vi.mock("@/lib/emails/event-registration", () => ({
  renderEventRegistrationEmail: vi.fn(() => "<html>event email</html>"),
}));

let GET: (req: Request) => Promise<Response>;

const VALID_TOKEN = "11111111-2222-4333-8444-555555555555";

beforeEach(async () => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  state.subscriberResult = { data: null, error: null };
  state.updateError = null;
  state.updateSpy = vi.fn() as unknown as UpdateSpy;
  state.intentsResult = { data: [], error: null };
  state.eventResults = [];
  state.eventResultIndex = 0;
  state.registrationInsertCalls = [];
  state.registrationInsertError = null;
  state.intentsDeleteCalled = false;
  state.sendCalls = [];
  state.sendError = null;
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
  // --- Original tests (DO NOT BREAK) ---

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
    state.subscriberResult = {
      data: { id: "s1", email: "a@b.com", status: "confirmed", token: VALID_TOKEN },
      error: null,
    };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/confirm?already=true");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("does NOT re-activate a blocked subscriber [SEC-001]", async () => {
    state.subscriberResult = {
      data: { id: "s1", email: "a@b.com", status: "blocked", token: VALID_TOKEN },
      error: null,
    };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/?error=invalid");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("does NOT re-confirm an unsubscribed subscriber [SEC-001 whitelist]", async () => {
    state.subscriberResult = {
      data: { id: "s1", email: "a@b.com", status: "unsubscribed", token: VALID_TOKEN },
      error: null,
    };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/?error=invalid");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("rejects unknown future statuses (fail-closed) [SEC-001 whitelist]", async () => {
    state.subscriberResult = {
      data: { id: "s1", email: "a@b.com", status: "quarantined", token: VALID_TOKEN },
      error: null,
    };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/?error=invalid");
    expect(state.updateSpy).not.toHaveBeenCalled();
  });

  it("confirms a pending subscriber and redirects to /newsletter/confirm (no intents)", async () => {
    state.subscriberResult = {
      data: { id: "s1", email: "a@b.com", status: "pending", token: VALID_TOKEN },
      error: null,
    };
    state.intentsResult = { data: [], error: null };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(locationOf(res)).toContain("/newsletter/confirm");
    expect(locationOf(res)).not.toContain("error=");
    expect(locationOf(res)).not.toContain("already=");
    expect(locationOf(res)).not.toContain("event=");
    expect(state.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
  });

  // --- New intent-processing tests ---

  it("processes pending event intents after confirmation (redirect with ?event=true)", async () => {
    const eventId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    state.subscriberResult = {
      data: { id: "s1", email: "user@test.com", status: "pending", token: VALID_TOKEN },
      error: null,
    };
    state.intentsResult = {
      data: [{ event_id: eventId }],
      error: null,
    };
    state.eventResults = [
      {
        data: {
          id: eventId,
          title: "BLACK SHEEP Night",
          event_date: "2026-06-01T22:00:00Z",
          venue: "11 Clubroom",
          description: "Party night",
          status: "published",
          registration_deadline: null,
        },
        error: null,
      },
    ];
    const res = await GET(makeReq(VALID_TOKEN));
    expect(state.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
    expect(state.registrationInsertCalls).toHaveLength(1);
    expect(state.sendCalls).toHaveLength(1);
    expect(state.intentsDeleteCalled).toBe(true);
    expect(locationOf(res)).toContain("/newsletter/confirm?event=true");
  });

  it("skips intents for archived/unpublished events", async () => {
    const eventId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    state.subscriberResult = {
      data: { id: "s1", email: "user@test.com", status: "pending", token: VALID_TOKEN },
      error: null,
    };
    state.intentsResult = {
      data: [{ event_id: eventId }],
      error: null,
    };
    state.eventResults = [
      {
        data: {
          id: eventId,
          title: "Old Party",
          event_date: "2026-06-01T22:00:00Z",
          venue: "Club",
          description: null,
          status: "archived",
          registration_deadline: null,
        },
        error: null,
      },
    ];
    const res = await GET(makeReq(VALID_TOKEN));
    expect(state.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
    expect(state.registrationInsertCalls).toHaveLength(0);
    expect(state.sendCalls).toHaveLength(0);
    expect(state.intentsDeleteCalled).toBe(true);
    // No event processed → standard redirect without ?event=true
    expect(locationOf(res)).toContain("/newsletter/confirm");
    expect(locationOf(res)).not.toContain("event=");
  });

  it("skips intents for events with passed deadline", async () => {
    const eventId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    state.subscriberResult = {
      data: { id: "s1", email: "user@test.com", status: "pending", token: VALID_TOKEN },
      error: null,
    };
    state.intentsResult = {
      data: [{ event_id: eventId }],
      error: null,
    };
    state.eventResults = [
      {
        data: {
          id: eventId,
          title: "Deadline Passed Party",
          event_date: "2026-06-01T22:00:00Z",
          venue: "Club",
          description: null,
          status: "published",
          // Deadline in the past
          registration_deadline: "2020-01-01T00:00:00Z",
        },
        error: null,
      },
    ];
    const res = await GET(makeReq(VALID_TOKEN));
    expect(state.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
    expect(state.registrationInsertCalls).toHaveLength(0);
    expect(state.sendCalls).toHaveLength(0);
    expect(state.intentsDeleteCalled).toBe(true);
    expect(locationOf(res)).toContain("/newsletter/confirm");
    expect(locationOf(res)).not.toContain("event=");
  });

  it("still confirms subscriber even if intent processing throws", async () => {
    state.subscriberResult = {
      data: { id: "s1", email: "user@test.com", status: "pending", token: VALID_TOKEN },
      error: null,
    };
    // Force an error from the intents query
    state.intentsResult = { data: null, error: { message: "DB exploded" } };
    const res = await GET(makeReq(VALID_TOKEN));
    expect(state.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
    // Subscriber is confirmed; redirect is standard (graceful degradation)
    expect(locationOf(res)).toContain("/newsletter/confirm");
    expect(locationOf(res)).not.toContain("error=");
  });
});
