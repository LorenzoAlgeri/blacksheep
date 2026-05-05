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
    expect(screen.getByTestId("bdtp-hour-display")).toHaveValue("11");
  });

  it("decrements minute by 1 with button", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T10:30" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /diminuisci minuti/i }));
    expect(screen.getByTestId("bdtp-minute-display")).toHaveValue("29");
  });

  it("hour wraps from 23 to 00", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T23:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /aumenta ore/i }));
    expect(screen.getByTestId("bdtp-hour-display")).toHaveValue("00");
  });

  it("hour wraps from 00 to 23 on decrement", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T00:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /diminuisci ore/i }));
    expect(screen.getByTestId("bdtp-hour-display")).toHaveValue("23");
  });

  it("minute wraps from 00 to 59 on decrement", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T10:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /diminuisci minuti/i }));
    expect(screen.getByTestId("bdtp-minute-display")).toHaveValue("59");
  });

  // Note: we use fireEvent.change here instead of user.type because user-event v14
  // does not reliably flush React 19 state updates between keystrokes in jsdom for
  // controlled inputs, producing flaky intermediate snapshots. fireEvent.change sets
  // the final value in one shot — equivalent to a paste/programmatic update — which
  // is the only behaviour we actually need to verify here. The interactive
  // keystroke-by-keystroke path is exercised by the Playwright visual smoke spec
  // (e2e/admin-event-picker.spec.ts).
  it("allows typing a new hour via keyboard input", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T10:30" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const hourInput = screen.getByRole("textbox", { name: /ore/i });
    fireEvent.change(hourInput, { target: { value: "22" } });
    fireEvent.blur(hourInput);
    expect(screen.getByTestId("bdtp-hour-display")).toHaveValue("22");
  });

  it("allows typing a new minute via keyboard input", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T10:30" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    const minuteInput = screen.getByRole("textbox", { name: /minuti/i });
    fireEvent.change(minuteInput, { target: { value: "45" } });
    fireEvent.blur(minuteInput);
    expect(screen.getByTestId("bdtp-minute-display")).toHaveValue("45");
  });

  it("selecting a day preserves the previously chosen time", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T22:45" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("gridcell", { name: /20 gennaio 2026/i }));
    await user.click(screen.getByRole("button", { name: /conferma/i }));
    expect(onChange).toHaveBeenCalledWith("2026-01-20T22:45");
  });
});

describe("BrandedDateTimePicker — month navigation focus", () => {
  it("clicking month arrow keeps a focusable day cell in the visible month", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /mese successivo/i }));
    // After paging to February, exactly one cell within the visible month must
    // be tabbable so the roving tabindex never traps the user out of the grid.
    const tabbableCells = screen
      .getAllByRole("gridcell")
      .filter((cell) => cell.getAttribute("tabindex") === "0");
    expect(tabbableCells).toHaveLength(1);
    // And it must be a February day, not a leftover January day.
    const dataDay = tabbableCells[0].getAttribute("data-bdtp-day");
    expect(dataDay).toMatch(/^2026-02-/);
  });

  it("clamps focused day when navigating to a shorter month", async () => {
    const user = userEvent.setup();
    // Jan 31 → click prev → December has 31 days, OK. Click prev again → November has 30.
    // Use a clearer case: March 31 → prev → February (28 days in 2026).
    render(<BrandedDateTimePicker value="2026-03-31T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    await user.click(screen.getByRole("button", { name: /mese precedente/i }));
    const tabbableCells = screen
      .getAllByRole("gridcell")
      .filter((cell) => cell.getAttribute("tabindex") === "0");
    expect(tabbableCells).toHaveLength(1);
    expect(tabbableCells[0].getAttribute("data-bdtp-day")).toBe("2026-02-28");
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

describe("BrandedDateTimePicker — focus restoration & visual state", () => {
  it("restores focus to the trigger after Conferma", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: /apri selettore data/i });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /conferma/i }));
    expect(trigger).toHaveFocus();
  });

  it("restores focus to the trigger after Annulla", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: /apri selettore data/i });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /annulla/i }));
    expect(trigger).toHaveFocus();
  });

  it("invalid prop applies the burgundy error border on the trigger", () => {
    render(<BrandedDateTimePicker value="" onChange={() => {}} invalid />);
    const trigger = screen.getByRole("button", { name: /apri selettore data/i });
    expect(trigger.className).toMatch(/border-bs-burgundy/);
  });
});

describe("BrandedDateTimePicker — calendar grid ARIA structure", () => {
  it("wraps every day cell in a role=row (ARIA grid pattern)", async () => {
    const user = userEvent.setup();
    render(<BrandedDateTimePicker value="2026-01-15T20:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /apri selettore data/i }));
    // 6 day-rows + 1 weekday-header row = 7
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(7);
    // Every gridcell must descend from a row element
    const cells = screen.getAllByRole("gridcell");
    for (const cell of cells) {
      expect(cell.closest("[role='row']")).not.toBeNull();
    }
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
