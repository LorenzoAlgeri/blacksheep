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

  // [SEC-002] CSV / formula injection.
  // Excel, Numbers and LibreOffice treat any cell whose first character is
  // =, +, -, @, \t or \r as a formula. When an admin opens the CSV, the
  // formula executes — a malicious subscriber name like `=cmd|'/c calc'!A0`
  // can lead to arbitrary command execution on the admin's machine. We
  // neutralise leading-formula characters by prefixing a single quote.
  describe("formula-injection mitigation", () => {
    function rowWithName(name: string) {
      return {
        registered_at: "2026-05-01T10:00:00Z",
        source: "form",
        subscriber: { email: "user@test.com", name, status: "confirmed", gender: "male" },
      };
    }

    async function runWithName(name: string): Promise<string> {
      state.listResponse = { data: [rowWithName(name)], error: null };
      const res = await GET(req(), ctx());
      expect(res.status).toBe(200);
      return await res.text();
    }

    it("prefixes leading '=' [SEC-002]", async () => {
      const text = await runWithName("=cmd|'/c calc'!A0");
      expect(text).toContain("'=cmd|'/c calc'!A0");
      expect(text).not.toMatch(/(^|,)=cmd/m);
    });

    it("prefixes leading '+' [SEC-002]", async () => {
      const text = await runWithName("+SUM(A1:A2)");
      expect(text).toContain("'+SUM(A1:A2)");
    });

    it("prefixes leading '-' [SEC-002]", async () => {
      const text = await runWithName("-2+3");
      expect(text).toContain("'-2+3");
    });

    it("prefixes leading '@' [SEC-002]", async () => {
      const text = await runWithName("@SUM(A1)");
      expect(text).toContain("'@SUM(A1)");
    });

    it("prefixes leading TAB [SEC-002]", async () => {
      const text = await runWithName("\t=cmd");
      expect(text).toContain("'\t=cmd");
    });

    it("prefixes leading CR [SEC-002]", async () => {
      const text = await runWithName("\r=cmd");
      // CR also triggers RFC 4180 quoting; the apostrophe must precede the CR.
      expect(text).toContain('"\'\r=cmd"');
    });

    it("does not prefix safe leading characters", async () => {
      const text = await runWithName("Mario Rossi");
      expect(text).toContain("Mario Rossi");
      expect(text).not.toContain("'Mario Rossi");
    });

    it("does not prefix '=' that appears mid-field", async () => {
      const text = await runWithName("Mario=Rossi");
      expect(text).toContain("Mario=Rossi");
      expect(text).not.toContain("'Mario=Rossi");
    });

    it("prefixes leading LF [SEC-002]", async () => {
      const text = await runWithName("\n=cmd");
      // LF triggers RFC 4180 quoting; the apostrophe must precede the LF.
      expect(text).toContain('"\'\n=cmd"');
    });

    it("prefixes leading '=' AND quotes when the value also contains a comma [SEC-002]", async () => {
      // Combined defence-in-depth case: both the formula prefix and the
      // RFC 4180 quoting must apply, and the apostrophe must end up
      // INSIDE the surrounding quotes.
      const text = await runWithName("=A,B");
      expect(text).toContain('"\'=A,B"');
    });
  });
});
