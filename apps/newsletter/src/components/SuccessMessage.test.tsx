import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuccessMessage } from "./SuccessMessage";

describe("SuccessMessage", () => {
  it("renders the confirmation heading", () => {
    render(<SuccessMessage />);
    expect(screen.getByText("CI SEI")).toBeInTheDocument();
  });

  it("renders the email confirmation instructions", () => {
    render(<SuccessMessage />);
    expect(screen.getByText(/controlla la tua email/i)).toBeInTheDocument();
  });
});
