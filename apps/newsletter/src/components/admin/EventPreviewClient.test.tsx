import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventPreviewClient } from "./EventPreviewClient";

// Mock EventCard to avoid IntersectionObserver / matchMedia / CSS.supports complexity
vi.mock("@/components/events/EventCard", () => ({
  EventCard: ({ event }: { event: { title: string } }) => (
    <div data-testid="event-card-mock">{event.title}</div>
  ),
}));

const event = {
  id: "abc-123",
  slug: "test-event",
  title: "TEST EVENT PREVIEW",
  event_date: "2026-06-01T20:00:00Z",
  venue: "Test Venue, Milano",
  description: null,
  capacity: null,
};

afterEach(() => {
  cleanup();
});

describe("EventPreviewClient", () => {
  it("renders 'ANTEPRIMA' in banner for all statuses", () => {
    const statuses = ["draft", "published", "archived"] as const;
    for (const status of statuses) {
      const { unmount } = render(<EventPreviewClient event={event} status={status} />);
      expect(screen.getByText(/ANTEPRIMA/i)).toBeDefined();
      unmount();
    }
  });

  it("draft banner signals event is not yet public", () => {
    render(<EventPreviewClient event={event} status="draft" />);
    expect(screen.getByText(/NON è ancora visibile/i)).toBeDefined();
    expect(document.querySelector("[data-preview-status='draft']")).not.toBeNull();
  });

  it("published banner signals event is already public", () => {
    render(<EventPreviewClient event={event} status="published" />);
    expect(screen.getByText(/è già pubblico/i)).toBeDefined();
    expect(document.querySelector("[data-preview-status='published']")).not.toBeNull();
  });

  it("archived banner signals event is archived", () => {
    render(<EventPreviewClient event={event} status="archived" />);
    expect(screen.getByText(/archiviato/i)).toBeDefined();
    expect(document.querySelector("[data-preview-status='archived']")).not.toBeNull();
  });

  it("renders EventCard with event data", () => {
    render(<EventPreviewClient event={event} status="draft" />);
    const card = screen.getByTestId("event-card-mock");
    expect(card.textContent).toContain("TEST EVENT PREVIEW");
  });

  it("banner is sticky (has sticky class)", () => {
    render(<EventPreviewClient event={event} status="draft" />);
    const banner = document.querySelector("[data-preview-status]");
    expect(banner?.className).toContain("sticky");
  });
});
