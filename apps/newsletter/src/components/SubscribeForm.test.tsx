import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscribeForm } from "./SubscribeForm";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("SubscribeForm", () => {
  it("renders the email input and submit button", () => {
    render(<SubscribeForm />);
    expect(screen.getByPlaceholderText("La tua email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ISCRIVITI/i })).toBeInTheDocument();
  });

  it("shows success message after valid submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "ok" }),
    });

    const user = userEvent.setup();
    render(<SubscribeForm />);

    await user.type(screen.getByPlaceholderText("La tua email"), "test@example.com");
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
      expect(screen.getByText(/email valida/i)).toBeInTheDocument();
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
});
