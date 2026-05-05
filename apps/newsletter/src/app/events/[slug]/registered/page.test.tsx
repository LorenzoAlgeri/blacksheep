import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EventRegisteredPage from "./page";

// vi.mock is hoisted by Vitest before imports, so next/image is mocked
// when EventRegisteredPage (which uses it) is first loaded.
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

/**
 * Async RSC test pattern: await the component function to get resolved JSX,
 * then render synchronously with @testing-library/react.
 */
async function renderPage(status: string | undefined) {
  const jsx = await EventRegisteredPage({
    searchParams: Promise.resolve(status !== undefined ? { status } : {}),
  });
  render(jsx);
}

describe("EventRegisteredPage", () => {
  it('renders "CI SEI" heading and confirmation subtitle for status=ok', async () => {
    await renderPage("ok");
    expect(screen.getByRole("heading", { name: /CI SEI/i })).toBeDefined();
    expect(screen.getByText(/Sei in lista/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Torna al sito/i })).toBeDefined();
  });

  it('renders "GIÀ DENTRO" heading and already-registered subtitle for status=already', async () => {
    await renderPage("already");
    // Use partial regex to avoid RTL accessor issues with accented capital À
    expect(screen.getByRole("heading", { name: /GIÀ DENTRO/ })).toBeDefined();
    expect(screen.getByText(/Eri già in lista/i)).toBeDefined();
  });

  it('renders "LINK NON VALIDO" heading and invalid-link subtitle for status=invalid', async () => {
    await renderPage("invalid");
    expect(screen.getByText(/LINK NON VALIDO/)).toBeDefined();
    expect(screen.getByText(/non è più attivo/i)).toBeDefined();
  });

  it('renders "EVENTO NON DISPONIBILE" heading and unavailable subtitle for status=event_unavailable', async () => {
    await renderPage("event_unavailable");
    expect(screen.getByText(/EVENTO NON DISPONIBILE/)).toBeDefined();
    expect(screen.getByText(/spostato/i)).toBeDefined();
  });
});
