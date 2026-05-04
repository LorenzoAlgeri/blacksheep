import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminNav } from "./AdminNav";

const mockSignOut = vi.fn();
const mockPathname = vi.fn(() => "/admin");

vi.mock("next-auth/react", () => ({ signOut: (...args: unknown[]) => mockSignOut(...args) }));
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminNav", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockPathname.mockReturnValue("/admin");
  });

  it("renders all nav links including Eventi", () => {
    render(<AdminNav />);
    expect(screen.getAllByRole("link", { name: "Iscritti" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Eventi" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Invia" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Impostazioni" }).length).toBeGreaterThan(0);
  });

  it("renders Eventi link with correct href", () => {
    render(<AdminNav />);
    const eventiLinks = screen.getAllByRole("link", { name: "Eventi" });
    expect(eventiLinks[0]).toHaveAttribute("href", "/admin/events");
  });

  it("renders Esci button with correct aria-label", () => {
    render(<AdminNav />);
    const esciButtons = screen.getAllByRole("button", { name: /esci dall'area amministratore/i });
    expect(esciButtons.length).toBeGreaterThan(0);
  });

  it("calls signOut with correct callbackUrl on desktop Esci click", () => {
    render(<AdminNav />);
    const [desktopEsci] = screen.getAllByRole("button", { name: /esci dall'area amministratore/i });
    fireEvent.click(desktopEsci);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/newsletter/admin/login" });
  });

  it("shows mobile menu on hamburger click and includes Esci", () => {
    render(<AdminNav />);
    const hamburger = screen.getByRole("button", { name: /apri menu/i });
    fireEvent.click(hamburger);
    const esciButtons = screen.getAllByRole("button", { name: /esci dall'area amministratore/i });
    expect(esciButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("calls signOut from mobile Esci button", () => {
    render(<AdminNav />);
    fireEvent.click(screen.getByRole("button", { name: /apri menu/i }));
    const [, mobileEsci] = screen.getAllByRole("button", {
      name: /esci dall'area amministratore/i,
    });
    fireEvent.click(mobileEsci);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/newsletter/admin/login" });
  });
});
