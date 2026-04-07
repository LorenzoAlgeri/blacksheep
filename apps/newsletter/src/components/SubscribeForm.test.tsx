import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
});
