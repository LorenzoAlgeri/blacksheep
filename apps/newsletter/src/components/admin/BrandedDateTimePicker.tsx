"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

interface BrandedDateTimePickerProps {
  /** datetime-local format "YYYY-MM-DDTHH:MM" or empty string */
  value: string;
  /** Emits same datetime-local format on Conferma */
  onChange: (value: string) => void;
  id?: string;
  "aria-describedby"?: string;
  /** When true, applies an error border. ARIA invalid state is signaled via the
   * aria-describedby error message, since aria-invalid is not valid on buttons. */
  invalid?: boolean;
  className?: string;
}

const WEEKDAYS_IT = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const MINUTE_STEP = 5;

const triggerWeekdayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short" });
const triggerMonthFmt = new Intl.DateTimeFormat("it-IT", { month: "short" });
const monthLongFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
const cellAriaFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseLocal(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function triggerLabel(d: Date): string {
  const weekday = triggerWeekdayFmt.format(d).replace(/\.$/, "").toUpperCase();
  const day = pad2(d.getDate());
  const month = triggerMonthFmt.format(d).replace(/\.$/, "").toUpperCase();
  const year = d.getFullYear();
  return `${weekday} ${day} ${month} ${year} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 6×7 grid starting from the Monday on/before the 1st of `anchor`'s month.
function buildGrid(anchor: Date): { date: Date; inMonth: boolean }[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  // JS dow: 0=Sunday … 6=Saturday — shift so Monday=0
  const dowMon = (first.getDay() + 6) % 7;
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - dowMon + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

export function BrandedDateTimePicker({
  value,
  onChange,
  id,
  "aria-describedby": ariaDescribedBy,
  invalid,
  className,
}: BrandedDateTimePickerProps) {
  const dialogId = useId();
  const monthLabelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseLocal(value) ?? new Date());
  const [anchor, setAnchor] = useState<Date>(() => parseLocal(value) ?? new Date());
  const [focusedDay, setFocusedDay] = useState<Date>(() => parseLocal(value) ?? new Date());

  // Reset draft/anchor/focus to `value` when transitioning closed → open.
  // Done in the toggle handler (not an effect) so we avoid cascading renders.
  function openPopover() {
    const seed = parseLocal(value) ?? new Date();
    setDraft(seed);
    setAnchor(seed);
    setFocusedDay(seed);
    setOpen(true);
  }

  // Click-outside + Escape — only while open.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onDocKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open]);

  const valueDate = parseLocal(value);
  const today = useMemo(() => new Date(), []);
  const grid = useMemo(() => buildGrid(anchor), [anchor]);
  const monthLabel = monthLongFmt.format(anchor);

  // matchMedia is gated behind `open` so the check only runs once the popover mounts
  // post-hydration — avoids SSR/CSR mismatch and keeps tests deterministic.
  const reducedMotion =
    open &&
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function selectDay(day: Date) {
    setDraft(
      (prev) =>
        new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          prev.getHours(),
          prev.getMinutes(),
        ),
    );
    setFocusedDay(day);
  }

  function gotoMonth(delta: number) {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function bumpHour(delta: number) {
    setDraft((prev) => {
      const h = (prev.getHours() + delta + 24) % 24;
      return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), h, prev.getMinutes());
    });
  }

  function bumpMinute(delta: number) {
    setDraft((prev) => {
      const m = (prev.getMinutes() + delta + 60) % 60;
      return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), prev.getHours(), m);
    });
  }

  function commit() {
    onChange(formatLocal(draft));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function dismiss() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onDayKeyDown(e: KeyboardEvent<HTMLButtonElement>, day: Date) {
    let next: Date | null = null;
    switch (e.key) {
      case "ArrowRight":
        next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
        break;
      case "ArrowLeft":
        next = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
        break;
      case "ArrowDown":
        next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 7);
        break;
      case "ArrowUp":
        next = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 7);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectDay(day);
        return;
      default:
        return;
    }
    e.preventDefault();
    const crossesMonth =
      next.getMonth() !== anchor.getMonth() || next.getFullYear() !== anchor.getFullYear();
    if (crossesMonth) {
      setAnchor(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    setFocusedDay(next);
    // In-month moves can focus immediately (target cell is already mounted).
    // Cross-month requires waiting for the re-render.
    const focusFn = () => {
      const sel = wrapperRef.current?.querySelector<HTMLButtonElement>(
        `[data-bdtp-day="${dateKey(next!)}"]`,
      );
      sel?.focus();
    };
    if (crossesMonth) {
      requestAnimationFrame(focusFn);
    } else {
      focusFn();
    }
  }

  // Auto-focus the selected day when popover first opens (skipped on subsequent
  // renders to avoid stealing focus from time spinners or footer buttons).
  const lastOpenRef = useRef(false);
  useEffect(() => {
    if (open && !lastOpenRef.current) {
      lastOpenRef.current = true;
      requestAnimationFrame(() => {
        const sel = wrapperRef.current?.querySelector<HTMLButtonElement>(
          `[data-bdtp-day="${dateKey(focusedDay)}"]`,
        );
        sel?.focus();
      });
    } else if (!open) {
      lastOpenRef.current = false;
    }
  }, [open, focusedDay]);

  const inputClass =
    "w-full bg-transparent border border-bs-cream/20 rounded-md px-3 py-2 text-sm text-bs-cream focus:outline-none focus:border-bs-cream/40 cursor-pointer text-left flex items-center justify-between gap-3 min-h-[44px]";

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label="Apri selettore data e ora"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? setOpen(false) : openPopover())}
        className={`${inputClass} ${invalid ? "border-bs-burgundy/60" : ""}`.trim()}
      >
        {valueDate ? (
          <span className="font-[family-name:var(--font-brand)] tracking-[0.15em]">
            {triggerLabel(valueDate)}
          </span>
        ) : (
          <span className="font-body text-bs-cream/30">Seleziona data e ora</span>
        )}
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          className="shrink-0 text-bs-cream/40"
        >
          <path
            d="M3 5h10M5 3v3M11 3v3M3 8h10v5H3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </svg>
      </button>

      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label="Selettore data e ora"
          aria-labelledby={monthLabelId}
          className={`absolute left-0 right-0 top-full mt-2 z-50 bg-[#0a0a0a]/95 backdrop-blur border border-bs-cream/10 rounded-lg shadow-2xl p-4 ${
            reducedMotion ? "" : "animate-fade-in-scale"
          }`}
        >
          {/* Header: prev arrow · month label · next arrow */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => gotoMonth(-1)}
              aria-label="Mese precedente"
              className="w-9 h-9 inline-flex items-center justify-center rounded text-bs-cream/60 hover:text-bs-cream hover:bg-bs-cream/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-bs-cream/40"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16">
                <path
                  d="M10 3 5 8l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                />
              </svg>
            </button>
            <span
              id={monthLabelId}
              data-testid="bdtp-month-label"
              role="status"
              aria-live="polite"
              className="font-[family-name:var(--font-brand)] text-sm tracking-[0.2em] uppercase text-bs-cream"
            >
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => gotoMonth(1)}
              aria-label="Mese successivo"
              className="w-9 h-9 inline-flex items-center justify-center rounded text-bs-cream/60 hover:text-bs-cream hover:bg-bs-cream/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-bs-cream/40"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16">
                <path
                  d="m6 3 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                />
              </svg>
            </button>
          </div>

          {/* Calendar grid */}
          <div role="grid" aria-labelledby={monthLabelId}>
            <div role="row" className="grid grid-cols-7 mb-1">
              {WEEKDAYS_IT.map((w) => (
                <span
                  key={w}
                  role="columnheader"
                  className="font-body text-[10px] tracking-[0.15em] text-bs-cream/30 text-center py-1"
                >
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {grid.map(({ date, inMonth }, idx) => {
                const selected = isSameDay(draft, date);
                const isToday = isSameDay(today, date);
                const isFocused = isSameDay(focusedDay, date);
                let cls =
                  "min-h-[44px] flex items-center justify-center rounded font-[family-name:var(--font-brand)] text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-bs-cream/60";
                if (selected) {
                  cls += " bg-bs-cream text-[#0a0a0a]";
                } else if (isToday) {
                  cls += " border border-bs-cream/40 text-bs-cream hover:bg-bs-cream/5";
                } else if (inMonth) {
                  cls += " text-bs-cream hover:bg-bs-cream/5";
                } else {
                  cls += " text-bs-cream/20 hover:bg-bs-cream/5";
                }
                return (
                  <button
                    key={`${idx}-${dateKey(date)}`}
                    type="button"
                    role="gridcell"
                    aria-selected={selected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={cellAriaFmt.format(date)}
                    data-bdtp-day={dateKey(date)}
                    tabIndex={isFocused ? 0 : -1}
                    onClick={() => selectDay(date)}
                    onKeyDown={(e) => onDayKeyDown(e, date)}
                    className={cls}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time spinner */}
          <div className="mt-4 pt-4 border-t border-bs-cream/10 flex items-center justify-center gap-2">
            <TimeSpinner
              label="ore"
              ariaUp="Aumenta ore"
              ariaDown="Diminuisci ore"
              testId="bdtp-hour-display"
              value={pad2(draft.getHours())}
              onUp={() => bumpHour(1)}
              onDown={() => bumpHour(-1)}
            />
            <span aria-hidden="true" className="text-bs-cream/30 text-2xl pb-2">
              :
            </span>
            <TimeSpinner
              label="minuti"
              ariaUp="Aumenta minuti"
              ariaDown="Diminuisci minuti"
              testId="bdtp-minute-display"
              value={pad2(draft.getMinutes())}
              onUp={() => bumpMinute(MINUTE_STEP)}
              onDown={() => bumpMinute(-MINUTE_STEP)}
            />
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Annulla"
              className="font-body text-xs tracking-wider text-bs-cream/40 hover:text-bs-cream transition-colors px-2 py-1 cursor-pointer"
            >
              ANNULLA
            </button>
            <button
              type="button"
              onClick={commit}
              aria-label="Conferma"
              className="font-[family-name:var(--font-brand)] text-xs tracking-wider bg-bs-cream text-[#0a0a0a] px-4 py-2 rounded hover:bg-bs-cream/90 transition-colors cursor-pointer"
            >
              CONFERMA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimeSpinnerProps {
  label: string;
  ariaUp: string;
  ariaDown: string;
  testId: string;
  value: string;
  onUp: () => void;
  onDown: () => void;
}

function TimeSpinner({ label, ariaUp, ariaDown, testId, value, onUp, onDown }: TimeSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={ariaUp}
        onClick={onUp}
        className="w-9 h-7 inline-flex items-center justify-center rounded text-bs-cream/50 hover:text-bs-cream hover:bg-bs-cream/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-bs-cream/40"
      >
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 16 16">
          <path d="M3 11l5-6 5 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <div
        data-testid={testId}
        role="spinbutton"
        aria-label={label}
        aria-valuetext={value}
        tabIndex={-1}
        className="font-[family-name:var(--font-brand)] text-3xl text-bs-cream tabular-nums leading-none px-2 select-none"
      >
        {value}
      </div>
      <button
        type="button"
        aria-label={ariaDown}
        onClick={onDown}
        className="w-9 h-7 inline-flex items-center justify-center rounded text-bs-cream/50 hover:text-bs-cream hover:bg-bs-cream/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-bs-cream/40"
      >
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 16 16">
          <path d="M3 5l5 6 5-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
