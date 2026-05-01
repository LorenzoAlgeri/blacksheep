import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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

describe("NoSubscriberDialog", () => {
  it("renders heading + content + CTA button", () => {
    render(<NoSubscriberDialog open onClose={() => {}} onSubscribeClick={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /ISCRIVITI PRIMA ALLA NEWSLETTER/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Iscriviti alla newsletter/i })).toBeInTheDocument();
  });

  it("calls onSubscribeClick when CTA is clicked", () => {
    const onSubscribeClick = vi.fn();
    render(<NoSubscriberDialog open onClose={() => {}} onSubscribeClick={onSubscribeClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Iscriviti alla newsletter/i }));
    expect(onSubscribeClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on ESC", () => {
    const onClose = vi.fn();
    render(<NoSubscriberDialog open onClose={onClose} onSubscribeClick={() => {}} />);
    const dialog = screen.getByRole("dialog");
    dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("links DialogHeader/Content via aria-labelledby/describedby", () => {
    render(<NoSubscriberDialog open onClose={() => {}} onSubscribeClick={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)).not.toBeNull();
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)).not.toBeNull();
  });

  it("CTA button has touch target ≥44px", () => {
    render(<NoSubscriberDialog open onClose={() => {}} onSubscribeClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /Iscriviti alla newsletter/i });
    expect(btn.className).toContain("min-h-[44px]");
  });
});
