import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventRegistrationFlow } from "./EventRegistrationFlow";
import type { EventCardData } from "./EventCard";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockEvent: EventCardData = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "test-night",
  title: "Test Night",
  event_date: "2026-05-09T22:00:00Z",
  venue: "11 Clubroom",
  description: null,
  capacity: null,
};

function makeResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body };
}

beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
  mockFetch.mockReset();
});

afterEach(() => {
  cleanup();
});

async function fillAndSubmitForm(email = "user@example.com") {
  await userEvent.type(screen.getByLabelText(/^Email$/i), email);
  await userEvent.type(screen.getByLabelText(/Conferma email/i), email);
  fireEvent.click(screen.getByRole("button", { name: /Entra in lista/i }));
}

describe("EventRegistrationFlow", () => {
  it("renders the registration form dialog when mounted", () => {
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
  });

  it("shows RegistrationSuccessDialog on 'registered' response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        status: "registered",
        eventTitle: "Test Night",
        eventDate: "2026-05-09T22:00:00Z",
      }),
    );
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /CI SEI/i })).toBeInTheDocument();
    });
  });

  it("shows PendingConfirmationDialog on 'pending_subscriber' response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ status: "pending_subscriber", message: "Conferma prima" }),
    );
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /CONFERMA L.+EMAIL/i })).toBeInTheDocument();
    });
  });

  it("shows AlreadyRegisteredDialog on 'already_registered' response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        status: "already_registered",
        message: "Già iscritto",
        eventTitle: "Test Night",
        eventDate: "2026-05-09T22:00:00Z",
      }),
    );
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /GIÀ DENTRO/i })).toBeInTheDocument();
    });
  });

  it("shows NoSubscriberDialog inline form on 'no_subscriber' response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ status: "no_subscriber", message: "Iscriviti prima" }),
    );
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /ISCRIVITI E ENTRA IN LISTA/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows inline error on API error response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ error: "Errore interno." }, false));
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Errore interno.");
    });
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
  });

  it("shows NoSubscriberDialog success state on 'pending_confirmation'", async () => {
    // First: no_subscriber, then registerAndSubscribe → pending_confirmation
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "no_subscriber", message: "Iscriviti prima" }))
      .mockResolvedValueOnce(makeResponse({ status: "pending_confirmation" }));
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /ISCRIVITI E ENTRA IN LISTA/i }),
      ).toBeInTheDocument();
    });

    // Fill out the inline form
    fireEvent.click(screen.getByRole("radio", { name: /Donna/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /ISCRIVITI E ENTRA IN LISTA/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /CONTROLLA LA TUA EMAIL/i })).toBeInTheDocument();
    });
  });

  it("shows ContactHelpDialog from PendingConfirmationDialog Scrivici button", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ status: "pending_subscriber", message: "Conferma prima" }),
    );
    render(<EventRegistrationFlow event={mockEvent} onClose={() => {}} />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Scrivici/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Scrivici/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /SCRIVICI/i })).toBeInTheDocument();
    });
  });
});
