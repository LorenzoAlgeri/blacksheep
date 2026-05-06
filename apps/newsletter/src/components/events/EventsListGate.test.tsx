import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { EventsListGate } from "./EventsListGate";
import { MASCOTTE_END_EVENT, MASCOTTE_START_EVENT } from "@/components/MascotteIntro";

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

  it("opens via boot fallback if MASCOTTE_START_EVENT never fires", () => {
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    // Pre-timeout: still gated.
    expect(
      screen.getByText("child content").parentElement!.getAttribute("data-events-gate-mounted"),
    ).toBe("false");
    // Advance past the 5200ms boot fallback window — covers the case
    // where the mascot never even reports a start (lazy chunk failure).
    act(() => {
      vi.advanceTimersByTime(5200);
    });
    expect(
      screen.getByText("child content").parentElement!.getAttribute("data-events-gate-mounted"),
    ).toBe("true");
  });

  it("once MASCOTTE_START fires, the gate waits for END (or the from-start fallback)", () => {
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    // Mascot signals it really started — boot fallback should be
    // cleared and the gate stays closed waiting for END.
    act(() => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_START_EVENT));
    });
    // Short of the 5000ms from-start fallback: gate must still be
    // closed even though we've now passed the 5200ms boot deadline.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(
      screen.getByText("child content").parentElement!.getAttribute("data-events-gate-mounted"),
    ).toBe("false");
    // Cross the from-start fallback — gate opens.
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(
      screen.getByText("child content").parentElement!.getAttribute("data-events-gate-mounted"),
    ).toBe("true");
  });

  it("removes the listeners and clears timers on unmount (no late-fire crash)", () => {
    const { unmount } = render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    unmount();
    // After unmount, dispatching the events should not throw (listeners
    // removed) and advancing timers should not call setState on an
    // unmounted component.
    expect(() => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_START_EVENT));
      window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
      vi.advanceTimersByTime(20000);
    }).not.toThrow();
  });

  it("does NOT lock html/body scroll while gated (revised: scroll is allowed during the intro)", () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    render(
      <EventsListGate>
        <p>child content</p>
      </EventsListGate>,
    );
    // Prior implementation locked overflow:hidden on both html and body
    // until MASCOTTE_END. The intro-only mascot strategy lifts that
    // restriction so the user can scroll the page even while the
    // mascotte is still playing on top of it.
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("applies inert={!mounted} so descendants stay out of the tab order while gated", () => {
    render(
      <EventsListGate>
        <button>cta</button>
      </EventsListGate>,
    );
    const wrapper = screen.getByText("cta").parentElement!;
    // While gated, inert keeps focus / mouse / pointer events away from
    // the children even though they're still in the accessibility tree
    // hierarchy. Replaces the older `pointer-events-none` approach,
    // which only blocked the mouse and let keyboard tab into invisible
    // content.
    expect(wrapper.hasAttribute("inert")).toBe(true);
    act(() => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
    });
    expect(wrapper.hasAttribute("inert")).toBe(false);
  });
});
