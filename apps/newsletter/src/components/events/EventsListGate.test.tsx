import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
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

describe("EventsListGate (minimal a11y-only gate)", () => {
  it("starts hidden from a11y (inert + aria-hidden) until the mascot finishes", () => {
    const { container } = render(
      <EventsListGate>
        <p>Lista eventi</p>
      </EventsListGate>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper.hasAttribute("inert")).toBe(true);
    expect(wrapper.dataset.eventsGateRevealed).toBe("false");
  });

  it("reveals (drops inert + aria-hidden) when MASCOTTE_END_EVENT fires", () => {
    const { container } = render(
      <EventsListGate>
        <p>Lista eventi</p>
      </EventsListGate>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
    });

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("false");
    expect(wrapper.hasAttribute("inert")).toBe(false);
    expect(wrapper.dataset.eventsGateRevealed).toBe("true");
  });

  it("falls back to revealing after 5 seconds if MASCOTTE_END_EVENT never fires", () => {
    const { container } = render(
      <EventsListGate>
        <p>Lista eventi</p>
      </EventsListGate>,
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.dataset.eventsGateRevealed).toBe("true");
  });

  it("reveals immediately when prefers-reduced-motion is on", () => {
    matchMediaMatches = true;

    const { container } = render(
      <EventsListGate>
        <p>Lista eventi</p>
      </EventsListGate>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.dataset.eventsGateRevealed).toBe("true");
  });

  it("does NOT lock html/body scroll (the mascot fixed overlay hides the list visually)", () => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    render(
      <EventsListGate>
        <p>Lista eventi</p>
      </EventsListGate>,
    );

    expect(document.documentElement.style.overflow).toBe(previousHtmlOverflow);
    expect(document.body.style.overflow).toBe(previousBodyOverflow);
  });

  it("does NOT apply any opacity transition class (no fade flash)", () => {
    const { container } = render(
      <EventsListGate>
        <p>Lista eventi</p>
      </EventsListGate>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/opacity-/);
    expect(wrapper.className).not.toMatch(/transition-/);
  });
});
