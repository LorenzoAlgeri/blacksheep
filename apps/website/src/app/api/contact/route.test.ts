import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/server — NextRequest is just Request in our route handler
vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest extends Request {
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
    }
  },
}));

// Reset rate limiter between tests by re-importing the module
let POST: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./route");
  POST = mod.POST as unknown as typeof POST;
});

function makeRequest(body: object, ip = "127.0.0.1"): Request {
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  const validBody = {
    name: "Mario Rossi",
    date: "14 aprile",
    guests: 4,
    message: "Test",
  };

  it("should return success with whatsappUrl for valid data", async () => {
    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.whatsappUrl).toContain("wa.me");
    expect(data.whatsappUrl).toContain("Mario");
  });

  it("should return 400 for invalid data", async () => {
    const res = await POST(makeRequest({ name: "", date: "", guests: 0 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Dati non validi.");
  });

  it("should return 400 for non-JSON body", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "x-forwarded-for": "1.1.1.1" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should silently accept honeypot submissions (no whatsappUrl)", async () => {
    const res = await POST(makeRequest({ ...validBody, website: "http://spam.com" }, "2.2.2.2"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.whatsappUrl).toBeUndefined();
  });

  it("should rate limit after 5 requests", async () => {
    const ip = "rate-test-" + Math.random();

    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest(validBody, ip));
      expect(res.status).toBe(200);
    }

    const res = await POST(makeRequest(validBody, ip));
    const data = await res.json();
    expect(res.status).toBe(429);
    expect(data.error).toContain("Troppi tentativi");
  });

  it("should HTML-escape user input in whatsappUrl", async () => {
    const res = await POST(
      makeRequest({ ...validBody, name: '<script>alert("xss")</script>' }, "3.3.3.3"),
    );
    const data = await res.json();

    const decoded = decodeURIComponent(data.whatsappUrl);
    expect(decoded).not.toContain("<script>");
    expect(decoded).toContain("&lt;script&gt;");
  });
});
