import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventsList } from "./EventsList";
import type { EventCardData } from "./EventCard";

// Mock EventCard to keep this test focused on EventsList composition.
// The real EventCard has its own dedicated test file.
vi.mock("./EventCard", () => ({
  EventCard: ({
    event,
    index,
  }: {
    event: EventCardData;
    index: number;
    onRegisterClick: (e: EventCardData) => void;
  }) => (
    <div data-testid="mock-event-card" data-event-id={event.id} data-index={index}>
      {event.title}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

const events: EventCardData[] = [
  {
    id: "evt-a",
    slug: "a",
    title: "EVENT ALPHA",
    event_date: "2026-05-15T19:00:00Z",
    venue: "Venue A",
  },
  {
    id: "evt-b",
    slug: "b",
    title: "EVENT BRAVO",
    event_date: "2026-06-01T19:00:00Z",
    venue: "Venue B",
  },
  {
    id: "evt-c",
    slug: "c",
    title: "EVENT CHARLIE",
    event_date: "2026-07-15T19:00:00Z",
    venue: "Venue C",
  },
];

describe("EventsList", () => {
  it("renders the section heading 'BLACKSHEEP LIST' as <h2>", () => {
    render(<EventsList events={events} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toMatch(/BLACKSHEEP LIST/i);
  });

  it("renders one EventCard per event with correct title and incremental index", () => {
    render(<EventsList events={events} />);
    const cards = screen.getAllByTestId("mock-event-card");
    expect(cards).toHaveLength(3);
    expect(cards[0].getAttribute("data-event-id")).toBe("evt-a");
    expect(cards[0].getAttribute("data-index")).toBe("0");
    expect(cards[1].getAttribute("data-index")).toBe("1");
    expect(cards[2].getAttribute("data-index")).toBe("2");
    expect(screen.getByText("EVENT ALPHA")).toBeInTheDocument();
    expect(screen.getByText("EVENT CHARLIE")).toBeInTheDocument();
  });

  it("renders an empty state with editorial copy when events list is empty", () => {
    render(<EventsList events={[]} />);
    expect(screen.queryAllByTestId("mock-event-card")).toHaveLength(0);
    expect(screen.getByText(/nessun evento in lista/i)).toBeInTheDocument();
  });

  it("section uses aria-labelledby pointing at the heading", () => {
    render(<EventsList events={events} />);
    const section = screen.getByRole("region", { name: /BLACKSHEEP LIST/i });
    const labelledBy = section.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy!);
    expect(heading?.tagName).toBe("H2");
  });

  it("event cards are wrapped in an <ol> for semantic list ordering", () => {
    render(<EventsList events={events} />);
    const list = document.querySelector("ol");
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll("li").length).toBe(3);
  });

  it("empty state is still inside a labelled <section>, not orphaned", () => {
    render(<EventsList events={[]} />);
    const section = screen.getByRole("region", { name: /BLACKSHEEP LIST/i });
    expect(section).toBeInTheDocument();
    expect(section.textContent).toMatch(/nessun evento/i);
  });
});
