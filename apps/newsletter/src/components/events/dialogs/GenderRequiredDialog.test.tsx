import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GenderRequiredDialog } from "./GenderRequiredDialog";

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

describe("GenderRequiredDialog", () => {
  it("renders heading and body copy", () => {
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: /UN'ULTIMA COSA/i })).toBeInTheDocument();
    expect(screen.getByText(/Per completare l'iscrizione/i)).toBeInTheDocument();
  });

  it("renders both gender radio options", () => {
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("radio", { name: /Donna/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Uomo/i })).toBeInTheDocument();
  });

  it("renders ANNULLA and CONTINUA buttons", () => {
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("button", { name: /ANNULLA/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /CONTINUA/i })).toBeInTheDocument();
  });

  it("calls onCancel when ANNULLA is clicked", () => {
    const onCancel = vi.fn();
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /ANNULLA/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows validation error when CONTINUA clicked without selecting gender", () => {
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /CONTINUA/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not call onSubmit when no gender selected", () => {
    const onSubmit = vi.fn();
    render(<GenderRequiredDialog open onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /CONTINUA/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with selected gender value", () => {
    const onSubmit = vi.fn();
    render(<GenderRequiredDialog open onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("radio", { name: /Donna/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUA/i }));
    expect(onSubmit).toHaveBeenCalledWith("female");
  });

  it("calls onClose on ESC (cancel event)", () => {
    const onCancel = vi.fn();
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={onCancel} />);
    const dialog = screen.getByRole("dialog");
    dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("links DialogHeader/Content via aria-labelledby/describedby", () => {
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)).not.toBeNull();
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)).not.toBeNull();
  });

  it("CONTINUA button has touch target ≥44px", () => {
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: /CONTINUA/i });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("gender fieldset has a legend for accessibility", () => {
    render(<GenderRequiredDialog open onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("group", { name: /Genere/i })).toBeInTheDocument();
  });
});
