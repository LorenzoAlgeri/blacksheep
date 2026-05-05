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

// Default mock implementation: parses ?status=<state> from URL and returns
// only the subscribers in that state, mirroring the backend filter. Includes
// total/filteredTotal/statusCounts/followUpAvailable so the component reads
// fully populated responses (matches the real /api/admin/subscribers shape).
function statusCountsFor(rows: typeof mockSubscribers) {
  return {
    confirmed: rows.filter((s) => s.status === "confirmed").length,
    pending: rows.filter((s) => s.status === "pending").length,
    blocked: rows.filter((s) => s.status === "blocked").length,
  };
}

function defaultFetchImpl(input: string | URL | Request) {
  const url = typeof input === "string" ? input : input.toString();
  const match = url.match(/[?&]status=([^&]+)/);
  const status = match ? match[1] : null;
  const filtered = status ? mockSubscribers.filter((s) => s.status === status) : mockSubscribers;
  return Promise.resolve({
    ok: true,
    json: async () => ({
      subscribers: filtered,
      total: mockSubscribers.length,
      filteredTotal: filtered.length,
      statusCounts: statusCountsFor(mockSubscribers),
      followUpAvailable: true,
      followUpReadyCount: 0,
    }),
  } as Response);
}

describe("SubscriberTable", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Default: every test gets a fetch mock that filters by ?status=
    // unless overridden with mockReturnValueOnce / mockResolvedValueOnce
    // / mockRejectedValueOnce for that specific scenario.
    mockFetch.mockImplementation(defaultFetchImpl);
  });

  it("shows loading state initially", () => {
    mockFetch.mockReset(); // override default: never-resolves promise
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<SubscriberTable />);
    expect(screen.getByText("Caricamento...")).toBeInTheDocument();
  });

  it("renders confirmed subscribers by default", async () => {
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getAllByText("confirmed@test.com").length).toBeGreaterThanOrEqual(1);
    });
    // Pending and blocked should not be visible in confirmed tab
    expect(screen.queryByText("pending@test.com")).not.toBeInTheDocument();
    expect(screen.queryByText("blocked@test.com")).not.toBeInTheDocument();
  });

  it("shows all 4 stat cards with correct counts", async () => {
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
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confermati" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "In attesa" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bloccati" })).toBeInTheDocument();
    });
  });

  it("switches tab to show pending subscribers", async () => {
    const user = userEvent.setup();
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "In attesa" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "In attesa" }));

    await waitFor(() => {
      expect(screen.getAllByText("pending@test.com").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText("confirmed@test.com")).not.toBeInTheDocument();
  });

  it("switches tab to show blocked subscribers", async () => {
    const user = userEvent.setup();
    render(<SubscriberTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Bloccati" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Bloccati" }));

    await waitFor(() => {
      expect(screen.getAllByText("blocked@test.com").length).toBeGreaterThanOrEqual(1);
    });
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

  it("shows followUpReadyCount from API on confirmed tab — regression bug #1", async () => {
    // API returns followUpReadyCount: 5 regardless of active tab
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      const match = url.match(/[?&]status=([^&]+)/);
      const status = match ? match[1] : null;
      const filtered = status
        ? mockSubscribers.filter((s) => s.status === status)
        : mockSubscribers;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          subscribers: filtered,
          total: mockSubscribers.length,
          filteredTotal: filtered.length,
          statusCounts: statusCountsFor(mockSubscribers),
          followUpAvailable: true,
          followUpReadyCount: 5,
        }),
      } as Response);
    });

    render(<SubscriberTable />);
    // Default tab is "confirmed" — confirmed subscribers have no pending rows
    // Old bug: eligiblePending computed from confirmed tab's data → always 0
    // Fix: followUpReadyCount comes from API and stays 5
    await waitFor(() => screen.getByTestId("followup-ready-count"));
    expect(screen.getByTestId("followup-ready-count").textContent).toBe("5");
  });
});
