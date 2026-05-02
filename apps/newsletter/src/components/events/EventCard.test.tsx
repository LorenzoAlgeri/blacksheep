import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EventCard, type EventCardData } from "./EventCard";

// jsdom doesn't implement matchMedia or IntersectionObserver — polyfill both.
beforeEach(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  global.IntersectionObserver = class MockIO {
    callback: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb;
    }
    observe(el: Element) {
      this.callback(
        [
          {
            isIntersecting: true,
            target: el,
            intersectionRatio: 1,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: 0,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  };
  // jsdom may not implement CSS.supports either — default to false to
  // exercise the fallback branch in tests; specific tests override.
  if (typeof CSS !== "undefined" && typeof CSS.supports !== "function") {
    Object.defineProperty(CSS, "supports", {
      configurable: true,
      writable: true,
      value: () => false,
    });
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const event: EventCardData = {
  id: "55555555-5555-4555-8555-555555555555",
  slug: "monday-club-night-may",
  title: "BLACK SHEEP — MONDAY CLUB NIGHT",
  event_date: "2026-05-15T19:00:00Z", // 21:00 Europe/Rome
  venue: "11 Clubroom — Corso Como, Milano",
  description: "Lineup top secret. Dress: dark / streetwear curato.",
};

describe("EventCard V1 Editorial Drama", () => {
  it("renders title, venue, day, month, weekday, and time", () => {
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.textContent).toContain("BLACK");
    expect(heading.textContent).toContain("MONDAY");
    expect(heading.textContent).toContain("NIGHT");
    expect(screen.getByText(/11 Clubroom — Corso Como, Milano/i)).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("MAG")).toBeInTheDocument();
    // 21:00 appears in both the display and the sr-only formatted full date.
    expect(screen.getAllByText(/21:00/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders description when provided, omits when null", () => {
    const { unmount } = render(<EventCard event={event} onRegisterClick={() => {}} />);
    expect(screen.getByText(/Lineup top secret/)).toBeInTheDocument();
    unmount();
    render(<EventCard event={{ ...event, description: null }} onRegisterClick={() => {}} />);
    expect(screen.queryByText(/Lineup top secret/)).not.toBeInTheDocument();
  });

  it("counter overline reflects index ('01' for index 0, '10' for index 9)", () => {
    const { unmount } = render(<EventCard event={event} onRegisterClick={() => {}} index={0} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    unmount();
    render(<EventCard event={event} onRegisterClick={() => {}} index={9} />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("splits title into per-word spans with --word-i custom prop", () => {
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    const wordSpans = document.querySelectorAll("[data-bs-word]");
    // "BLACK SHEEP — MONDAY CLUB NIGHT" → split on /\s+/ →
    // ["BLACK", "SHEEP", "—", "MONDAY", "CLUB", "NIGHT"] (em-dash is a standalone token).
    expect(wordSpans.length).toBe(6);
    // First and last spans carry --word-i = 0 and 5 respectively.
    expect((wordSpans[0] as HTMLElement).style.getPropertyValue("--word-i")).toBe("0");
    expect(
      (wordSpans[wordSpans.length - 1] as HTMLElement).style.getPropertyValue("--word-i"),
    ).toBe("5");
  });

  it("calls onRegisterClick with the full event when CTA is clicked", () => {
    const onRegisterClick = vi.fn();
    render(<EventCard event={event} onRegisterClick={onRegisterClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Entra in lista/i }));
    expect(onRegisterClick).toHaveBeenCalledTimes(1);
    expect(onRegisterClick).toHaveBeenCalledWith(event);
  });

  it("CTA button has touch target ≥44px (WCAG 2.5.5)", () => {
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /Entra in lista/i });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("uses semantic <article> with aria-labelledby pointing at <h3>", () => {
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    const article = screen.getByRole("article");
    const labelledBy = article.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy!);
    expect(heading?.tagName).toBe("H3");
  });

  it("escapes HTML in title, venue, and description (React default)", () => {
    render(
      <EventCard
        event={{
          ...event,
          title: "<script>x</script>",
          venue: "<b>fake</b>",
          description: "<img onerror=1>",
        }}
        onRegisterClick={() => {}}
      />,
    );
    expect(document.querySelector("article script")).toBeNull();
    expect(document.querySelector("article img")).toBeNull();
    expect(screen.getByText("<b>fake</b>")).toBeInTheDocument();
  });

  it("falls back to 'data tba' on invalid event_date", () => {
    render(<EventCard event={{ ...event, event_date: "not-a-date" }} onRegisterClick={() => {}} />);
    expect(screen.getByText(/data tba/i)).toBeInTheDocument();
  });

  it("renders capacity badge when capacity > 0, omits otherwise", () => {
    const { unmount } = render(
      <EventCard event={{ ...event, capacity: 150 }} onRegisterClick={() => {}} />,
    );
    expect(screen.getByText(/cap · 150/i)).toBeInTheDocument();
    unmount();
    render(<EventCard event={{ ...event, capacity: null }} onRegisterClick={() => {}} />);
    expect(screen.queryByText(/cap ·/i)).not.toBeInTheDocument();
  });

  it("when CSS.supports('animation-timeline: view()') is false, fallback chain activates (data-fallback=true, data-animated=true after IO)", () => {
    Object.defineProperty(CSS, "supports", {
      configurable: true,
      writable: true,
      value: () => false,
    });
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    const article = screen.getByRole("article");
    expect(article.getAttribute("data-fallback")).toBe("true");
    expect(article.getAttribute("data-animated")).toBe("true");
  });

  it("when CSS.supports('animation-timeline: view()') is true, native scroll-timeline path is taken (data-fallback=false)", () => {
    Object.defineProperty(CSS, "supports", {
      configurable: true,
      writable: true,
      value: () => true,
    });
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    const article = screen.getByRole("article");
    expect(article.getAttribute("data-fallback")).toBe("false");
  });

  it("exposes --card-i CSS custom property derived from index", () => {
    render(<EventCard event={event} onRegisterClick={() => {}} index={3} />);
    const article = screen.getByRole("article");
    expect(article.style.getPropertyValue("--card-i")).toBe("3");
  });

  it("includes screen-reader full date for context", () => {
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    // formatEventDate returns Europe/Rome 'it-IT' formatted string with year.
    expect(screen.getByText(/Data evento:/)).toBeInTheDocument();
  });

  it("hairline rule and bottom signature line are in the DOM as decorative spans", () => {
    render(<EventCard event={event} onRegisterClick={() => {}} />);
    expect(document.querySelector("[data-bs-rule]")).not.toBeNull();
    expect(document.querySelector("[data-bs-line]")).not.toBeNull();
  });
});
