import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEventRegistration } from "./useEventRegistration";
import type { Gender } from "@/lib/validations";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const EVENT_ID = "00000000-0000-0000-0000-000000000001";

function makeResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("useEventRegistration", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    expect(result.current.state.kind).toBe("idle");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("register() transitions to submitting then registered on success response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        status: "registered",
        eventTitle: "Black Night",
        eventDate: "2026-05-09T22:00:00Z",
      }),
    );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("registered");
    if (result.current.state.kind === "registered") {
      expect(result.current.state.eventTitle).toBe("Black Night");
      expect(result.current.state.eventDate).toBe("2026-05-09T22:00:00Z");
    }
  });

  it("register() transitions to pending_subscriber", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ status: "pending_subscriber", message: "Conferma prima" }),
    );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("pending_subscriber");
    if (result.current.state.kind === "pending_subscriber") {
      expect(result.current.state.email).toBe("user@example.com");
    }
  });

  it("register() transitions to already_registered", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        status: "already_registered",
        message: "Già iscritto",
        eventTitle: "Black Night",
        eventDate: "2026-05-09T22:00:00Z",
      }),
    );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("already_registered");
    if (result.current.state.kind === "already_registered") {
      expect(result.current.state.eventTitle).toBe("Black Night");
    }
  });

  it("register() transitions to no_subscriber", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ status: "no_subscriber", message: "Iscriviti prima" }),
    );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("no_subscriber");
  });

  it("register() on HTTP 4xx → error state with server message", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ error: "Errore interno." }, false, 500));
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toBe("Errore interno.");
    }
  });

  it("register() on HTTP 429 → error state with rate-limit message", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ error: "Troppi tentativi. Riprova tra un minuto." }, false, 429),
    );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toContain("Troppi tentativi");
    }
  });

  it("register() on network error → error state", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network down"));
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("error");
  });

  it("register() while submitting is idempotent (ignores double-click)", async () => {
    let resolveFirst!: (v: ReturnType<typeof makeResponse>) => void;
    mockFetch.mockReturnValueOnce(
      new Promise<ReturnType<typeof makeResponse>>((res) => {
        resolveFirst = res;
      }),
    );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));

    act(() => {
      void result.current.register("user@example.com", "user@example.com");
    });

    // Second call while first is in-flight — should be ignored
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFirst(
      makeResponse({ status: "registered", eventTitle: "T", eventDate: "2026-05-09T22:00:00Z" }),
    );
  });

  it("dismiss() resets state to idle", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "no_subscriber", message: "" }));
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("no_subscriber");
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.state.kind).toBe("idle");
  });

  it("sends correct request body to API", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ status: "registered", eventTitle: "T", eventDate: "2026-05-09T22:00:00Z" }),
    );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("User@Example.COM", "User@Example.COM");
    });
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.eventId).toBe(EVENT_ID);
    expect(body.email).toBe("User@Example.COM");
    expect(body.emailConfirmation).toBe("User@Example.COM");
  });

  it("register() transitions to gender_required when server returns that status", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "gender_required" }));
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("gender_required");
    if (result.current.state.kind === "gender_required") {
      expect(result.current.state.email).toBe("user@example.com");
      expect(result.current.state.emailConfirmation).toBe("user@example.com");
    }
  });

  it("submitGender() sends gender + stored email to API and transitions to registered", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "gender_required" }))
      .mockResolvedValueOnce(
        makeResponse({
          status: "registered",
          eventTitle: "Black Night",
          eventDate: "2026-05-09T22:00:00Z",
        }),
      );
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    expect(result.current.state.kind).toBe("gender_required");
    await act(async () => {
      await result.current.submitGender("female" as Gender);
    });
    expect(result.current.state.kind).toBe("registered");
    const [, init] = mockFetch.mock.calls[1];
    const body = JSON.parse(init.body as string);
    expect(body.gender).toBe("female");
    expect(body.email).toBe("user@example.com");
  });

  it("submitGender() on error transitions to error state", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "gender_required" }))
      .mockResolvedValueOnce(makeResponse({ error: "Errore interno." }, false, 500));
    const { result } = renderHook(() => useEventRegistration(EVENT_ID));
    await act(async () => {
      await result.current.register("user@example.com", "user@example.com");
    });
    await act(async () => {
      await result.current.submitGender("female" as Gender);
    });
    expect(result.current.state.kind).toBe("error");
  });
});
