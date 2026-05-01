import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RegistrationSuccessDialog } from "./RegistrationSuccessDialog";

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

const baseProps = {
  open: true,
  onClose: vi.fn(),
  eventTitle: "BLACK SHEEP — Monday Club Night",
  eventDate: "2026-05-15T19:00:00Z",
  eventVenue: "11 Clubroom — Corso Como",
};

describe("RegistrationSuccessDialog", () => {
  it("renders heading 'CI SEI' and event title when open", () => {
    render(<RegistrationSuccessDialog {...baseProps} />);
    expect(screen.getByRole("heading", { name: /CI SEI/i })).toBeInTheDocument();
    expect(screen.getByText(/BLACK SHEEP — Monday Club Night/)).toBeInTheDocument();
  });

  it("formats and renders the event date in it-IT", () => {
    render(<RegistrationSuccessDialog {...baseProps} />);
    expect(screen.getByText(/15.*mag.*2026/i)).toBeInTheDocument();
  });

  it("renders the venue when provided", () => {
    render(<RegistrationSuccessDialog {...baseProps} />);
    expect(screen.getByText("11 Clubroom — Corso Como")).toBeInTheDocument();
  });

  it("does not render when open=false (showModal not called)", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(<RegistrationSuccessDialog {...baseProps} open={false} />);
    expect(showModal).not.toHaveBeenCalled();
    showModal.mockRestore();
  });

  it("calls onClose when 'Chiudi' button is clicked", () => {
    const onClose = vi.fn();
    render(<RegistrationSuccessDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Chiudi/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("escapes HTML in eventTitle (React default escaping)", () => {
    render(<RegistrationSuccessDialog {...baseProps} eventTitle="<script>alert('xss')</script>" />);
    // The literal string is rendered as text; querying by exact text proves
    // it was NOT interpreted as HTML
    expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
    // And there is no actual <script> element in the document
    expect(document.querySelector("script")).toBeNull();
  });

  it("links DialogHeader to aria-labelledby and DialogContent to aria-describedby", () => {
    render(<RegistrationSuccessDialog {...baseProps} />);
    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).not.toBeNull();
    expect(document.getElementById(describedBy!)).not.toBeNull();
  });
});
