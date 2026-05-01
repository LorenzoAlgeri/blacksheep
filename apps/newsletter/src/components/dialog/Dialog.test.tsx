import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Dialog } from "./Dialog";

// jsdom does not implement HTMLDialogElement.showModal/close, so we polyfill
// with simple stubs that toggle the `open` attribute. Real focus-trap and
// ESC handling get validated in browser via Playwright in Phase 12.
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

describe("Dialog primitive", () => {
  it("calls showModal when open=true", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(
      <Dialog open onClose={() => {}}>
        <p>content</p>
      </Dialog>,
    );
    expect(showModal).toHaveBeenCalled();
    showModal.mockRestore();
  });

  it("does NOT call showModal when open=false", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(
      <Dialog open={false} onClose={() => {}}>
        <p>content</p>
      </Dialog>,
    );
    expect(showModal).not.toHaveBeenCalled();
    showModal.mockRestore();
  });

  it("renders role=dialog and aria-modal=true", () => {
    render(
      <Dialog open onClose={() => {}} ariaLabelledBy="title-1" ariaDescribedBy="desc-1">
        <h2 id="title-1">Title</h2>
        <p id="desc-1">Body</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "title-1");
    expect(dialog).toHaveAttribute("aria-describedby", "desc-1");
  });

  it("calls onClose when ESC fires onCancel and prevents default", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        <p>content</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    const cancelEvent = new Event("cancel", { bubbles: true, cancelable: true });
    dialog.dispatchEvent(cancelEvent);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it("calls onClose when click target is the dialog itself (backdrop area)", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        <p>content</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    // Simulate user click on the dialog element directly (not a child)
    dialog.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClose when click bubbles from a child", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        <p data-testid="child-content">content</p>
      </Dialog>,
    );
    screen.getByTestId("child-content").click();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("appends custom className alongside the brand defaults", () => {
    render(
      <Dialog open onClose={() => {}} className="custom-extra-class">
        <p>content</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("custom-extra-class");
    expect(dialog.className).toContain("max-w-md"); // base preserved
  });

  it("toggles open state when prop changes", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const close = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { rerender } = render(
      <Dialog open={false} onClose={() => {}}>
        <p>content</p>
      </Dialog>,
    );
    expect(showModal).not.toHaveBeenCalled();
    rerender(
      <Dialog open onClose={() => {}}>
        <p>content</p>
      </Dialog>,
    );
    expect(showModal).toHaveBeenCalledTimes(1);
    rerender(
      <Dialog open={false} onClose={() => {}}>
        <p>content</p>
      </Dialog>,
    );
    expect(close).toHaveBeenCalledTimes(1);
    showModal.mockRestore();
    close.mockRestore();
  });
});
