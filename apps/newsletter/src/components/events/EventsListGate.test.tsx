import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { EventsListGate } from "./EventsListGate";
import { MASCOTTE_END_EVENT } from "@/components/MascotteIntro";

let matchMediaMatches = false;

beforeEach(() => {
  matchMediaMatches = false;
  vi.useFakeTimers();
  window.matchMedia = ((query: string) =>
    ({
      matches: matchMediaMatches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("EventsListGate", () => {
  it("renders children with opacity-0 (gated) on initial mount", () => {
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    const wrapper = screen.getByText("child content").parentElement!;
    expect(wrapper.className).toContain("opacity-0");
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper.getAttribute("data-events-gate-mounted")).toBe("false");
  });

  it("opens (opacity-100) when MASCOTTE_END_EVENT is dispatched", () => {
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
    });
    const wrapper = screen.getByText("child content").parentElement!;
    expect(wrapper.className).toContain("opacity-100");
    expect(wrapper.getAttribute("aria-hidden")).toBe("false");
    expect(wrapper.getAttribute("data-events-gate-mounted")).toBe("true");
  });

  it("opens immediately when prefers-reduced-motion is set", () => {
    matchMediaMatches = true;
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    const wrapper = screen.getByText("child content").parentElement!;
    expect(wrapper.getAttribute("data-events-gate-mounted")).toBe("true");
    expect(wrapper.className).toContain("opacity-100");
  });

  it("opens via fallback timeout if MASCOTTE_END_EVENT never fires", () => {
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    // Pre-timeout: still gated.
    expect(
      screen.getByText("child content").parentElement!.getAttribute("data-events-gate-mounted"),
    ).toBe("false");
    // Advance past the 5000ms fallback window.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(
      screen.getByText("child content").parentElement!.getAttribute("data-events-gate-mounted"),
    ).toBe("true");
  });

  it("removes the listener and clears timeout on unmount (no late-fire crash)", () => {
    const { unmount } = render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    unmount();
    // After unmount, dispatching the event should not throw (listener removed)
    // and advancing timers should not call setState on an unmounted component.
    expect(() => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
      vi.advanceTimersByTime(10000);
    }).not.toThrow();
  });

  it("locks html and body scroll while gated, restores both when the gate opens", () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    act(() => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
    });
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("does NOT lock scroll when prefers-reduced-motion is set", () => {
    matchMediaMatches = true;
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("applies pointer-events-none when gated to block focus on hidden CTAs", () => {
    render(
      <EventsListGate>
        <button>cta</button>
      </EventsListGate>,
    );
    const wrapper = screen.getByText("cta").parentElement!;
    expect(wrapper.className).toContain("pointer-events-none");
  });
});
