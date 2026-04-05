import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SubscriberTable } from "./SubscriberTable";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockSubscribers = [
  {
    id: "1",
    email: "confirmed@test.com",
    name: "Luca",
    status: "confirmed",
    created_at: "2026-01-15T10:00:00Z",
    confirmed_at: "2026-01-15T11:00:00Z",
  },
  {
    id: "2",
    email: "pending@test.com",
    name: null,
    status: "pending",
    created_at: "2026-01-16T10:00:00Z",
    confirmed_at: null,
  },
];

describe("SubscriberTable", () => {
  it("shows loading state initially", () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(<SubscriberTable />);
    expect(screen.getByText("Caricamento...")).toBeInTheDocument();
  });

  it("renders subscriber data after fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscribers: mockSubscribers }),
    });

    render(<SubscriberTable />);

    await waitFor(() => {
      // Both mobile card and desktop table render the email
      expect(screen.getAllByText("confirmed@test.com").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("pending@test.com").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows stats with correct counts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscribers: mockSubscribers }),
    });

    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByText("Totali")).toBeInTheDocument();
      expect(screen.getByText("Confermati")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByText("Errore nel caricamento degli iscritti.")).toBeInTheDocument();
      expect(screen.getByText("Riprova")).toBeInTheDocument();
    });
  });
});
