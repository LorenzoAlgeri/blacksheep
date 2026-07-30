import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegistrationsTable } from "./RegistrationsTable";
import type { RegistrationRow } from "./RegistrationsTable";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/events/abc/registrations",
  useSearchParams: () => new URLSearchParams(),
}));

const makeReg = (
  overrides: Partial<RegistrationRow["subscriber"]> = {},
  id = "r1",
  attended = false,
): RegistrationRow => ({
  id,
  registered_at: "2026-05-01T20:00:00Z",
  source: "form",
  attended,
  attended_at: attended ? "2026-05-01T22:00:00Z" : null,
  subscriber: {
    id: "s1",
    email: "test@example.com",
    name: "Test User",
    status: "confirmed",
    gender: "female",
    ...overrides,
  },
});

const baseProps = {
  total: 1,
  page: 1,
  pageSize: 50,
  eventId: "abc",
  csvHref: "/newsletter/api/admin/events/abc/registrations/export.csv",
  xlsxHref: "/newsletter/api/admin/events/abc/registrations/export.xlsx",
};

describe("RegistrationsTable", () => {
  it("renders stats cards", () => {
    render(
      <RegistrationsTable
        {...baseProps}
        registrations={[makeReg({ status: "confirmed", gender: "female" })]}
      />,
    );
    expect(screen.getByText("Totale")).toBeDefined();
    expect(screen.getByText("Donne (omaggio)")).toBeDefined();
    expect(screen.getByText("Confermati")).toBeDefined();
  });

  it("shows 'Nessuna registrazione' empty state when total is 0", () => {
    render(<RegistrationsTable {...baseProps} registrations={[]} total={0} />);
    expect(screen.getByText(/Nessuna registrazione/i)).toBeDefined();
  });

  it("shows filter buttons", () => {
    render(<RegistrationsTable {...baseProps} registrations={[makeReg()]} />);
    expect(screen.getAllByText("TUTTI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CONFERMATI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IN ATTESA").length).toBeGreaterThan(0);
  });

  it("renders CSV export link with download attribute", () => {
    render(<RegistrationsTable {...baseProps} registrations={[makeReg()]} />);
    const csvLink = screen.getByText(/ESPORTA CSV/i).closest("a");
    expect(csvLink).toBeDefined();
    expect(csvLink?.getAttribute("download")).toBeDefined();
    expect(csvLink?.getAttribute("href")).toContain("export.csv");
  });

  it("renders gender as 'Donna' for female", () => {
    render(<RegistrationsTable {...baseProps} registrations={[makeReg({ gender: "female" })]} />);
    expect(screen.getAllByText("Donna").length).toBeGreaterThan(0);
  });

  it("renders '—' for null gender (legacy user)", () => {
    render(<RegistrationsTable {...baseProps} registrations={[makeReg({ gender: null })]} />);
    // Should not crash and email should be visible
    expect(screen.getAllByText("test@example.com").length).toBeGreaterThan(0);
  });

  it("shows a per-subscriber total event-registration count badge", () => {
    const reg: RegistrationRow = { ...makeReg({}, "r1"), eventCount: 3 };
    render(<RegistrationsTable {...baseProps} registrations={[reg]} />);
    // Badge is present (mobile + desktop) with an explanatory title and the number.
    expect(screen.getAllByTitle(/Iscrizioni a eventi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  it("does not render the count badge when eventCount is missing", () => {
    render(<RegistrationsTable {...baseProps} registrations={[makeReg({}, "r1")]} />);
    expect(screen.queryAllByTitle(/Iscrizioni a eventi/i)).toHaveLength(0);
  });

  it("uses server-provided full-event stats, not the paginated page (bug: counter capped at page size)", () => {
    // The visible page holds only 2 rows, but the event has 137 registrations.
    // The stat cards must reflect the whole event (137 / 42 present), not the page (2).
    render(
      <RegistrationsTable
        {...baseProps}
        registrations={[
          makeReg({ status: "confirmed" }, "r1"),
          makeReg({ status: "confirmed" }, "r2"),
        ]}
        total={137}
        stats={{ total: 137, confirmed: 120, pending: 17, women: 60, men: 70, womenConfirmed: 55 }}
        attendedCount={42}
      />,
    );
    // "Totale" card shows 137 (not 2)
    expect(screen.getByText("137")).toBeDefined();
    // "Presenti" card shows 42 (not the 0 attended in the 2-row page)
    expect(screen.getByText("42")).toBeDefined();
    // "Confermati" card shows 120 (not 2)
    expect(screen.getByText("120")).toBeDefined();
  });
});
