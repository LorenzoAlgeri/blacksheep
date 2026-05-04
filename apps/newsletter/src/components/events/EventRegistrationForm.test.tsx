import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventRegistrationForm } from "./EventRegistrationForm";

afterEach(() => {
  cleanup();
});

const baseProps = {
  onSubmit: vi.fn(),
  isSubmitting: false,
  error: null,
};

beforeEach(() => {
  baseProps.onSubmit.mockReset();
});

describe("EventRegistrationForm", () => {
  it("renders email, emailConfirmation inputs and submit button", () => {
    render(<EventRegistrationForm {...baseProps} />);
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Conferma email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entra in lista/i })).toBeInTheDocument();
  });

  it("submit button is disabled while isSubmitting=true", () => {
    render(<EventRegistrationForm {...baseProps} isSubmitting />);
    expect(screen.getByRole("button", { name: /in corso/i })).toBeDisabled();
  });

  it("shows server error when error prop is provided", () => {
    render(<EventRegistrationForm {...baseProps} error="Errore interno." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Errore interno.");
  });

  it("shows validation error when email is invalid", async () => {
    render(<EventRegistrationForm {...baseProps} />);
    await userEvent.type(screen.getByLabelText(/^Email$/i), "notanemail");
    await userEvent.type(screen.getByLabelText(/Conferma email/i), "notanemail");
    fireEvent.click(screen.getByRole("button", { name: /Entra in lista/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/email valida/i).length).toBeGreaterThan(0);
    });
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  it("shows mismatch error when emails don't match", async () => {
    render(<EventRegistrationForm {...baseProps} />);
    await userEvent.type(screen.getByLabelText(/^Email$/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/Conferma email/i), "b@example.com");
    fireEvent.click(screen.getByRole("button", { name: /Entra in lista/i }));
    await waitFor(() => {
      expect(screen.getByText(/non coincidono/i)).toBeInTheDocument();
    });
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with email and emailConfirmation on valid submit", async () => {
    render(<EventRegistrationForm {...baseProps} />);
    await userEvent.type(screen.getByLabelText(/^Email$/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/Conferma email/i), "user@example.com");
    fireEvent.click(screen.getByRole("button", { name: /Entra in lista/i }));
    await waitFor(() => {
      expect(baseProps.onSubmit).toHaveBeenCalledTimes(1);
      expect(baseProps.onSubmit).toHaveBeenCalledWith("user@example.com", "user@example.com");
    });
  });

  it("honeypot website field is hidden from user", () => {
    render(<EventRegistrationForm {...baseProps} />);
    const honeypot = document.querySelector('input[name="website"]');
    expect(honeypot).toBeInTheDocument();
    expect(honeypot?.closest("[aria-hidden]")).toBeTruthy();
  });

  it("email input has aria-invalid=true and aria-describedby pointing to error on invalid submit", async () => {
    render(<EventRegistrationForm {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Entra in lista/i }));
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/^Email$/i);
      expect(emailInput).toHaveAttribute("aria-invalid", "true");
      const errorId = emailInput.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId!)).toBeInTheDocument();
    });
  });

  it("email input has no aria-invalid and no aria-describedby on initial render", () => {
    render(<EventRegistrationForm {...baseProps} />);
    const emailInput = screen.getByLabelText(/^Email$/i);
    expect(emailInput).not.toHaveAttribute("aria-invalid", "true");
    expect(emailInput).not.toHaveAttribute("aria-describedby");
  });
});
