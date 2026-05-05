import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrandedDateTimePicker } from "./BrandedDateTimePicker";

// jsdom does not implement matchMedia. Tests opt-in to a specific value
// per case via setMatchMedia(matches).
function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  setMatchMedia(false); // default: motion allowed
});

afterEach(() => {
  cleanup();
});

describe("BrandedDateTimePicker — trigger", () => {
  it("renders placeholder when no value is provided", () => {
    render(<BrandedDateTimePicker value="" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: /apri selettore data/i });
    expect(trigger).toHaveTextContent(/seleziona data/i);
  });

  it("renders trigger with date formatted in italian uppercase", () => {
    // 2026-01-01 is a Thursday → "GIO 01 GEN 2026 · 20:30"
    render(<BrandedDateTimePicker value="2026-01-01T20:30" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: /apri selettore data/i });
    expect(trigger.textContent).toMatch(/GIO/);
    expect(trigger.textContent).toMatch(/01/);
    expect(trigger.textContent).toMatch(/GEN/);
    expect(trigger.textContent).toMatch(/2026/);
    expect(trigger.textContent).toMatch(/20:30/);
  });

  it("trigger has aria-haspopup=dialog and aria-expanded reflects state", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: /apri selettore data/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

describe("BrandedDateTimePicker — popover open/close", () => {
  it("opens popover on trigger click", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-01T20:30" onChange={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-label");
  });

  it("closes popover on Escape key", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-01T20:30" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes popover when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button" data-testid="outside">
          Outside
        </button>
        <BrandedDateTimePicker value="2026-01-01T20:30" onChange={() => {}} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("BrandedDateTimePicker — calendar grid", () => {
  it("renders calendar with role=grid and gridcells", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell").length).toBe(42); // 6 weeks × 7 days
  });

  it("displays italian month label in header", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const monthLabel = screen.getByTestId("bdtp-month-label");
    expect(monthLabel.textContent).toMatch(/gennaio/i);
    expect(monthLabel.textContent).toMatch(/2026/);
  });

  it("navigates to next month when forward arrow clicked", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /mese successivo/i }));
    expect(screen.getByTestId("bdtp-month-label").textContent).toMatch(/febbraio/i);
  });

  it("navigates to previous month when back arrow clicked", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-03-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /mese precedente/i }));
    expect(screen.getByTestId("bdtp-month-label").textContent).toMatch(/febbraio/i);
  });

  it("renders today's cell with aria-current=date", async () => {
    const user = userEvent.setup();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    render(<BrandedDateTimePicker value={`${yyyy}-${mm}-${dd}T12:00`} onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const todayCell = screen.getByText(String(today.getDate()), {
      selector: "[aria-current='date']",
    });
    expect(todayCell).toBeInTheDocument();
  });

  it("selecting a day updates the focused selection (not yet committed)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const day20 = screen.getByRole("gridcell", { name: /20 gennaio 2026/i });
    await user.click(day20);
    expect(day20).toHaveAttribute("aria-selected", "true");
    // onChange not called yet — committed only on Conferma
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("BrandedDateTimePicker — time spinners", () => {
  it("increments hour with +1 button", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T10:30" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /aumenta ore/i }));
    expect(screen.getByTestId("bdtp-hour-display")).toHaveTextContent("11");
  });

  it("decrements minute by 5 with -5 button", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T10:30" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /diminuisci minuti/i }));
    expect(screen.getByTestId("bdtp-minute-display")).toHaveTextContent("25");
  });

  it("hour wraps from 23 to 00", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T23:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /aumenta ore/i }));
    expect(screen.getByTestId("bdtp-hour-display")).toHaveTextContent("00");
  });
});

describe("BrandedDateTimePicker — commit/cancel", () => {
  it("calls onChange with datetime-local format on Conferma", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("gridcell", { name: /22 gennaio 2026/i }));
    await user.click(screen.getByRole("button", { name: /conferma/i }));
    expect(onChange).toHaveBeenCalledWith("2026-01-22T20:00");
    // popover should close after commit
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Annulla closes without calling onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("gridcell", { name: /22 gennaio 2026/i }));
    await user.click(screen.getByRole("button", { name: /annulla/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("BrandedDateTimePicker — accessibility & motion", () => {
  it("keyboard ArrowRight moves day focus by 1", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const day15 = screen.getByRole("gridcell", { name: /15 gennaio 2026/i });
    day15.focus();
    expect(day15).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    const day16 = screen.getByRole("gridcell", { name: /16 gennaio 2026/i });
    expect(day16).toHaveFocus();
  });

  it("does NOT apply animation class when prefers-reduced-motion is set", async () => {
    setMatchMedia(true);
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).not.toMatch(/animate-fade-in-scale/);
  });

  it("popover dialog exposes role=dialog and aria-modal=false (non-modal)", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const dialog = screen.getByRole("dialog");
    // Spec requires non-modal popover so screenreaders don't trap focus
    expect(dialog).toHaveAttribute("aria-modal", "false");
  });
});
