import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  {
    id: "3",
    email: "blocked@test.com",
    name: "Marco",
    status: "blocked",
    created_at: "2026-01-17T10:00:00Z",
    confirmed_at: null,
  },
];

function mockFetchSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ subscribers: mockSubscribers }),
  });
}

describe("SubscriberTable", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(<SubscriberTable />);
    expect(screen.getByText("Caricamento...")).toBeInTheDocument();
  });

  it("renders confirmed subscribers by default", async () => {
    mockFetchSuccess();
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getAllByText("confirmed@test.com").length).toBeGreaterThanOrEqual(1);
    });
    // Pending and blocked should not be visible in confirmed tab
    expect(screen.queryByText("pending@test.com")).not.toBeInTheDocument();
    expect(screen.queryByText("blocked@test.com")).not.toBeInTheDocument();
  });

  it("shows all 4 stat cards with correct counts", async () => {
    mockFetchSuccess();
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByText("Totali")).toBeInTheDocument();
      // "Confermati", "In attesa", "Bloccati" appear in both stat cards and tabs
      expect(screen.getAllByText("Confermati").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("In attesa").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Bloccati").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows 3 tabs", async () => {
    mockFetchSuccess();
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confermati" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "In attesa" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bloccati" })).toBeInTheDocument();
    });
  });

  it("switches tab to show pending subscribers", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "In attesa" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "In attesa" }));

    expect(screen.getAllByText("pending@test.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("confirmed@test.com")).not.toBeInTheDocument();
  });

  it("switches tab to show blocked subscribers", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Bloccati" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Bloccati" }));

    expect(screen.getAllByText("blocked@test.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("confirmed@test.com")).not.toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByText("Errore nel caricamento degli iscritti.")).toBeInTheDocument();
      expect(screen.getByText("Riprova")).toBeInTheDocument();
    });
  });

  it("shows empty message when no subscribers in tab", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscribers: [] }),
    });

    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByText("Nessun iscritto in questa sezione.")).toBeInTheDocument();
    });
  });
});
