import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscribeForm } from "./SubscribeForm";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("SubscribeForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  it("renders the email input and submit button", () => {
    render(<SubscribeForm />);
    expect(screen.getByPlaceholderText("La tua email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ISCRIVITI/i })).toBeInTheDocument();
  });

  it("renders gender fieldset with Donna and Uomo options", () => {
    render(<SubscribeForm />);
    expect(screen.getByRole("group", { name: /Genere/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Donna/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Uomo/i })).toBeInTheDocument();
  });

  it("blocks submit without gender selection", async () => {
    const user = userEvent.setup();
    render(<SubscribeForm />);
    await user.type(screen.getByPlaceholderText("La tua email"), "test@example.com");
    await user.type(screen.getByPlaceholderText(/ripeti/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /ISCRIVITI/i }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows success message after valid submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "ok" }),
    });

    const user = userEvent.setup();
    render(<SubscribeForm />);

    await user.type(screen.getByPlaceholderText("La tua email"), "test@example.com");
    await user.type(screen.getByPlaceholderText(/ripeti/i), "test@example.com");
    await user.click(screen.getByRole("radio", { name: /Donna/i }));
    await user.click(screen.getByRole("button", { name: /ISCRIVITI/i }));

    await waitFor(() => {
      expect(screen.getByText("CI SEI")).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<SubscribeForm />);

    await user.type(screen.getByPlaceholderText("La tua email"), "bad");
    await user.click(screen.getByRole("button", { name: /ISCRIVITI/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/email valida/i).length).toBeGreaterThan(0);
    });
  });

  it("shows server error when API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Rate limited" }),
    });

    const user = userEvent.setup();
    render(<SubscribeForm />);

    await user.type(screen.getByPlaceholderText("La tua email"), "test@example.com");
    await user.type(screen.getByPlaceholderText(/ripeti/i), "test@example.com");
    await user.click(screen.getByRole("radio", { name: /Donna/i }));
    await user.click(screen.getByRole("button", { name: /ISCRIVITI/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Rate limited");
    });
  });

  describe("email typo suggestion", () => {
    it("shows suggestion after blur with TLD typo", async () => {
      render(<SubscribeForm />);
      const emailInput = screen.getByPlaceholderText("La tua email");
      await userEvent.type(emailInput, "test@yahoo.con");
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(/forse intendevi/i);
        expect(screen.getByRole("status")).toHaveTextContent("test@yahoo.com");
      });
    });

    it("shows suggestion after blur with domain typo", async () => {
      render(<SubscribeForm />);
      const emailInput = screen.getByPlaceholderText("La tua email");
      await userEvent.type(emailInput, "test@libreo.it");
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("test@libero.it");
      });
    });

    it("does not show suggestion for valid known email on blur", async () => {
      render(<SubscribeForm />);
      const emailInput = screen.getByPlaceholderText("La tua email");
      await userEvent.type(emailInput, "test@gmail.com");
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.queryByRole("status")).toBeNull();
      });
    });

    it("clicking Correggi updates email value and hides suggestion", async () => {
      render(<SubscribeForm />);
      const emailInput = screen.getByPlaceholderText("La tua email");
      await userEvent.type(emailInput, "test@libreo.it");
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /correggi/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /correggi/i }));
      await waitFor(() => {
        expect(emailInput).toHaveValue("test@libero.it");
        expect(screen.queryByRole("status")).toBeNull();
      });
    });

    it("suggestion uses aria-live=polite (not role=alert)", async () => {
      render(<SubscribeForm />);
      const emailInput = screen.getByPlaceholderText("La tua email");
      await userEvent.type(emailInput, "test@gmail.con");
      fireEvent.blur(emailInput);
      await waitFor(() => {
        const status = screen.getByRole("status");
        expect(status).toHaveAttribute("aria-live", "polite");
      });
    });
  });

  describe("confirm email field", () => {
    it("renders confirm email input", () => {
      render(<SubscribeForm />);
      expect(screen.getByPlaceholderText(/ripeti/i)).toBeInTheDocument();
    });

    it("blocks submit when emails do not match", async () => {
      const user = userEvent.setup();
      render(<SubscribeForm />);
      await user.type(screen.getByPlaceholderText("La tua email"), "test@gmail.com");
      await user.type(screen.getByPlaceholderText(/ripeti/i), "other@gmail.com");
      await user.click(screen.getByRole("radio", { name: /Donna/i }));
      await user.click(screen.getByRole("button", { name: /ISCRIVITI/i }));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/non coincidono/i);
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("allows submit when emails match (case-insensitive)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "ok" }),
      });
      const user = userEvent.setup();
      render(<SubscribeForm />);
      await user.type(screen.getByPlaceholderText("La tua email"), "Test@gmail.com");
      await user.type(screen.getByPlaceholderText(/ripeti/i), "test@gmail.com");
      await user.click(screen.getByRole("radio", { name: /Donna/i }));
      await user.click(screen.getByRole("button", { name: /ISCRIVITI/i }));
      await waitFor(() => {
        expect(screen.getByText("CI SEI")).toBeInTheDocument();
      });
    });

    it("shows typo suggestion also on confirm field after blur", async () => {
      render(<SubscribeForm />);
      const confirmInput = screen.getByPlaceholderText(/ripeti/i);
      await userEvent.type(confirmInput, "test@gmail.con");
      fireEvent.blur(confirmInput);
      await waitFor(() => {
        const statuses = screen.getAllByRole("status");
        expect(statuses.some((s) => s.textContent?.includes("test@gmail.com"))).toBe(true);
      });
    });
  });

  describe("disposable email blocking", () => {
    it("shows blocking error for disposable email on main field blur", async () => {
      render(<SubscribeForm />);
      const emailInput = screen.getByPlaceholderText("La tua email");
      await userEvent.type(emailInput, "user@mailinator.com");
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/email personale/i);
      });
    });

    it("blocks submit when main email is disposable", async () => {
      const user = userEvent.setup();
      render(<SubscribeForm />);
      await user.type(screen.getByPlaceholderText("La tua email"), "user@mailinator.com");
      fireEvent.blur(screen.getByPlaceholderText("La tua email"));
      // wait for disposable alert to render (ensures state settled before submit)
      await waitFor(() => screen.getByRole("alert"));
      await user.type(screen.getByPlaceholderText(/ripeti/i), "user@mailinator.com");
      await user.click(screen.getByRole("button", { name: /ISCRIVITI/i }));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("disposable error is visually distinct from suggestion (role=alert not status)", async () => {
      render(<SubscribeForm />);
      const emailInput = screen.getByPlaceholderText("La tua email");
      await userEvent.type(emailInput, "user@yopmail.com");
      fireEvent.blur(emailInput);
      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toHaveTextContent(/email personale/i);
      });
    });
  });
});
