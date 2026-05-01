import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AlreadyRegisteredDialog } from "./AlreadyRegisteredDialog";

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
};

describe("AlreadyRegisteredDialog", () => {
  it("renders 'SEI GIÀ DENTRO' heading + event title", () => {
    render(<AlreadyRegisteredDialog {...baseProps} />);
    expect(screen.getByRole("heading", { name: /SEI GIÀ DENTRO/i })).toBeInTheDocument();
    expect(screen.getByText(/BLACK SHEEP — Monday Club Night/)).toBeInTheDocument();
  });

  it("renders event date formatted via lib/dates (Europe/Rome)", () => {
    render(<AlreadyRegisteredDialog {...baseProps} />);
    expect(screen.getByText(/15.*mag.*2026/i)).toBeInTheDocument();
  });

  it("calls onClose when 'Chiudi' is clicked", () => {
    const onClose = vi.fn();
    render(<AlreadyRegisteredDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Chiudi/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on ESC", () => {
    const onClose = vi.fn();
    render(<AlreadyRegisteredDialog {...baseProps} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("escapes HTML in eventTitle (React default)", () => {
    render(<AlreadyRegisteredDialog {...baseProps} eventTitle="<script>alert('xss')</script>" />);
    expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("links DialogHeader/Content via aria-labelledby/describedby", () => {
    render(<AlreadyRegisteredDialog {...baseProps} />);
    const dialog = screen.getByRole("dialog");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)).not.toBeNull();
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)).not.toBeNull();
  });
});
