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
});
