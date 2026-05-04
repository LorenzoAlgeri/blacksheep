import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactHelpDialog } from "./ContactHelpDialog";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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

describe("ContactHelpDialog", () => {
  it("renders heading, email, phone, name fields and submit button", () => {
    render(<ContactHelpDialog open onClose={() => {}} email="user@example.com" />);
    expect(screen.getByRole("heading", { name: /scrivici/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invia/i })).toBeInTheDocument();
  });

  it("pre-fills email from prop", () => {
    render(<ContactHelpDialog open onClose={() => {}} email="user@example.com" />);
    expect(screen.getByLabelText(/Email/i)).toHaveValue("user@example.com");
  });

  it("calls onClose on ESC", () => {
    const onClose = vi.fn();
    render(<ContactHelpDialog open onClose={onClose} email="" />);
    const dialog = screen.getByRole("dialog");
    dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows success message after successful submission", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ ok: true }));
    render(<ContactHelpDialog open onClose={() => {}} email="user@example.com" />);
    await userEvent.type(screen.getByLabelText(/Telefono/i), "+39 333 1234567");
    await userEvent.type(screen.getByLabelText(/Nome/i), "Mario");
    fireEvent.click(screen.getByRole("button", { name: /Invia/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(/ricevuto|grazie/i);
    });
  });

  it("shows error message on failed submission", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ error: "Errore interno." }, false));
    render(<ContactHelpDialog open onClose={() => {}} email="user@example.com" />);
    await userEvent.type(screen.getByLabelText(/Telefono/i), "+39 333 1234567");
    await userEvent.type(screen.getByLabelText(/Nome/i), "Mario");
    fireEvent.click(screen.getByRole("button", { name: /Invia/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("requires phone and name fields", async () => {
    render(<ContactHelpDialog open onClose={() => {}} email="user@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: /Invia/i }));
    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
