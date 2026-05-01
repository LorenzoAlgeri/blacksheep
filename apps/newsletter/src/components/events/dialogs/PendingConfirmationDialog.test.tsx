import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { PendingConfirmationDialog } from "./PendingConfirmationDialog";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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

const baseProps = {
  open: true,
  onClose: vi.fn(),
  email: "user@example.com",
  onContactHelpClick: vi.fn(),
};

describe("PendingConfirmationDialog", () => {
  it("renders heading + 2 buttons + anti-spam copy", () => {
    render(<PendingConfirmationDialog {...baseProps} />);
    expect(screen.getByRole("heading", { name: /CONFERMA L.+EMAIL/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reinvia email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Scrivici/i })).toBeInTheDocument();
    expect(screen.getByText(/Spam/)).toBeInTheDocument();
    expect(screen.getByText(/Promozioni/)).toBeInTheDocument();
  });

  it("calls fetch with email on Reinvia click", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    render(<PendingConfirmationDialog {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Reinvia email/i }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/events/resend-confirmation");
    expect(JSON.parse(init.body)).toEqual({ email: "user@example.com" });
  });

  it("disables button + shows 'Invio in corso...' during sending state", async () => {
    let resolveFetch: (v: { ok: boolean; status: number }) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<PendingConfirmationDialog {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Reinvia email/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Invio in corso/i })).toBeDisabled();
    });
    resolveFetch!({ ok: true, status: 200 });
  });

  it("shows success aria-live message after successful resend", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    render(<PendingConfirmationDialog {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Reinvia email/i }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/Email reinviata/);
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("shows specific error message on HTTP 429", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    render(<PendingConfirmationDialog {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Reinvia email/i }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/Aspetta qualche minuto/);
  });

  it("shows generic error on non-429 HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<PendingConfirmationDialog {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Reinvia email/i }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/Errore\. Riprova/);
  });

  it("shows network error on fetch rejection", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network down"));
    render(<PendingConfirmationDialog {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Reinvia email/i }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/Errore di rete/);
  });

  it("calls onContactHelpClick when Scrivici button is clicked", () => {
    const onContactHelpClick = vi.fn();
    render(<PendingConfirmationDialog {...baseProps} onContactHelpClick={onContactHelpClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Scrivici/i }));
    expect(onContactHelpClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on ESC (via Dialog primitive)", () => {
    const onClose = vi.fn();
    render(<PendingConfirmationDialog {...baseProps} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    const cancelEvent = new Event("cancel", { bubbles: true, cancelable: true });
    dialog.dispatchEvent(cancelEvent);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("links DialogHeader to aria-labelledby and DialogContent to aria-describedby", () => {
    render(<PendingConfirmationDialog {...baseProps} />);
    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).not.toBeNull();
    expect(document.getElementById(describedBy!)).not.toBeNull();
  });
});
