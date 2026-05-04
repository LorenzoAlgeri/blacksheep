import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePublishedEvents } from "./usePublishedEvents";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("usePublishedEvents", () => {
  it("starts in idle state when enabled=false", () => {
    const { result } = renderHook(() => usePublishedEvents(false));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.events).toEqual([]);
  });

  it("transitions to loading=true immediately when enabled=true", async () => {
    let resolve!: (v: ReturnType<typeof makeResponse>) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => usePublishedEvents(true));
    // After effect runs, loading should be true
    expect(result.current.loading).toBe(true);

    // Cleanup: resolve the pending promise
    await act(async () => {
      resolve(makeResponse({ events: [] }));
    });
  });

  it("populates events on successful fetch", async () => {
    const events = [
      { id: "1", slug: "test", title: "Test Event", event_date: "2026-06-01T20:00:00Z" },
    ];
    mockFetch.mockResolvedValueOnce(makeResponse({ events }));

    const { result } = renderHook(() => usePublishedEvents(true));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toEqual(events);
    expect(result.current.error).toBeNull();
  });

  it("sets error message on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, false, 500));

    const { result } = renderHook(() => usePublishedEvents(true));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBe("Errore caricamento eventi.");
  });

  it("sets error message on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network down"));

    const { result } = renderHook(() => usePublishedEvents(true));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Errore caricamento eventi.");
  });

  it("does NOT set error on AbortError (unmount during fetch)", async () => {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => usePublishedEvents(true));
    await act(async () => {});
    // AbortError is silently ignored
    expect(result.current.error).toBeNull();
  });

  it("resets to idle state when enabled flips to false", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ events: [{ id: "1", slug: "e", title: "T", event_date: null }] }),
    );

    const { result, rerender } = renderHook(({ enabled }) => usePublishedEvents(enabled), {
      initialProps: { enabled: true },
    });
    await act(async () => {});
    expect(result.current.events.length).toBe(1);

    rerender({ enabled: false });
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("sends correct API URL with status=published filter", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ events: [] }));
    renderHook(() => usePublishedEvents(true));
    await act(async () => {});
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("status=published");
    expect(url).toContain("sort=event_date_asc");
    expect(url).toContain("pageSize=50");
  });

  it("gracefully handles missing events array in response (defaults to [])", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({})); // no events key
    const { result } = renderHook(() => usePublishedEvents(true));
    await act(async () => {});
    expect(result.current.events).toEqual([]);
  });
});
