import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchActiveEvents } from "./fetchActiveEvents";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleEvents = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "monday-may",
    title: "BLACK SHEEP — MONDAY",
    event_date: "2026-05-15T19:00:00Z",
    venue: "11 Clubroom",
    description: "Lineup TBA",
    capacity: 200,
  },
];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchActiveEvents", () => {
  it("returns events array on 200 with well-formed payload", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { events: sampleEvents }));
    const result = await fetchActiveEvents({ baseUrl: "http://test" });
    expect(result).toEqual(sampleEvents);
  });

  it("returns empty array when API returns events: []", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { events: [] }));
    const result = await fetchActiveEvents({ baseUrl: "http://test" });
    expect(result).toEqual([]);
  });

  it("throws on 5xx error", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    await expect(fetchActiveEvents({ baseUrl: "http://test" })).rejects.toThrow(/500/);
  });

  it("throws on 404 (feature flag off)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(404, { error: "Not found" }));
    await expect(fetchActiveEvents({ baseUrl: "http://test" })).rejects.toThrow(/404/);
  });

  it("throws on malformed JSON (missing events key)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { wrong: "shape" }));
    await expect(fetchActiveEvents({ baseUrl: "http://test" })).rejects.toThrow(/malformed/i);
  });

  it("throws on non-array events field", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { events: "not-an-array" }));
    await expect(fetchActiveEvents({ baseUrl: "http://test" })).rejects.toThrow(/malformed/i);
  });

  it("propagates network errors (fetch rejection)", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("network down"));
    await expect(fetchActiveEvents({ baseUrl: "http://test" })).rejects.toThrow(/network down/);
  });

  it("calls the configured base URL + /newsletter/api/events", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { events: [] }));
    await fetchActiveEvents({ baseUrl: "http://my-host:9000" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://my-host:9000/newsletter/api/events",
      expect.any(Object),
    );
  });

  it("opts out of Next.js Data Cache so admin edits surface immediately", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { events: [] }));
    await fetchActiveEvents({ baseUrl: "http://test" });
    const [, init] = mockFetch.mock.calls[0];
    expect(init).toMatchObject({ cache: "no-store" });
  });
});
