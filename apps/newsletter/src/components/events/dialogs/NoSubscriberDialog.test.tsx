import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoSubscriberDialog } from "./NoSubscriberDialog";

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
});

afterEach(() => {
  cleanup();
});

describe("NoSubscriberDialog — form state", () => {
  it("renders heading + form fields + CTA button", () => {
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={() => {}} />,
    );
    expect(
      screen.getByRole("heading", { name: /ISCRIVITI E ENTRA IN LISTA/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Donna/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Uomo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ISCRIVITI E ENTRA IN LISTA/i })).toBeInTheDocument();
  });

  it("shows email as read-only text (not an input)", () => {
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    // The email should not be an input field
    const emailInputs = screen.queryAllByRole("textbox");
    const emailValues = emailInputs.map((el) => (el as HTMLInputElement).value);
    expect(emailValues).not.toContain("user@example.com");
  });

  it("shows validation errors when submitting without gender or consent", () => {
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /ISCRIVITI E ENTRA IN LISTA/i }));
    expect(screen.getByText(/Seleziona un'opzione/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy policy per continuare/i)).toBeInTheDocument();
  });

  it("calls onSubmit with correct data when form is valid", async () => {
    const onSubmit = vi.fn();
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByLabelText(/Nome/i), "Mario");
    fireEvent.click(screen.getByRole("radio", { name: /Donna/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /ISCRIVITI E ENTRA IN LISTA/i }));
    expect(onSubmit).toHaveBeenCalledWith("user@example.com", "Mario", "female");
  });

  it("sends undefined name when field is empty", () => {
    const onSubmit = vi.fn();
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Uomo/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /ISCRIVITI E ENTRA IN LISTA/i }));
    expect(onSubmit).toHaveBeenCalledWith("user@example.com", undefined, "male");
  });

  it("does not call onSubmit without consent", () => {
    const onSubmit = vi.fn();
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Donna/i }));
    // No consent checkbox click
    fireEvent.click(screen.getByRole("button", { name: /ISCRIVITI E ENTRA IN LISTA/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows submitting state", () => {
    render(
      <NoSubscriberDialog
        open
        email="user@example.com"
        onClose={() => {}}
        onSubmit={() => {}}
        isSubmitting
      />,
    );
    const btn = screen.getByRole("button", { name: /INVIO IN CORSO/i });
    expect(btn).toBeDisabled();
  });

  it("calls onClose on ANNULLA", () => {
    const onClose = vi.fn();
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={onClose} onSubmit={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /ANNULLA/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("CTA button has touch target >= 44px", () => {
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={() => {}} />,
    );
    const btn = screen.getByRole("button", { name: /ISCRIVITI E ENTRA IN LISTA/i });
    expect(btn.className).toContain("min-h-[44px]");
  });
});

describe("NoSubscriberDialog — submitted state", () => {
  it("shows success message when submitted=true", () => {
    render(
      <NoSubscriberDialog
        open
        email="user@example.com"
        onClose={() => {}}
        onSubmit={() => {}}
        submitted
      />,
    );
    expect(screen.getByRole("heading", { name: /CONTROLLA LA TUA EMAIL/i })).toBeInTheDocument();
    expect(screen.getByText(/email di conferma/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /HO CAPITO/i })).toBeInTheDocument();
  });

  it("calls onClose from HO CAPITO button", () => {
    const onClose = vi.fn();
    render(
      <NoSubscriberDialog
        open
        email="user@example.com"
        onClose={onClose}
        onSubmit={() => {}}
        submitted
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /HO CAPITO/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("links DialogHeader/Content via aria-labelledby/describedby", () => {
    render(
      <NoSubscriberDialog open email="user@example.com" onClose={() => {}} onSubmit={() => {}} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)).not.toBeNull();
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)).not.toBeNull();
  });
});
