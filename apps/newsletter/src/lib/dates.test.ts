import { describe, it, expect } from "vitest";
import { formatEventDate } from "./dates";

describe("formatEventDate", () => {
  it("formats a Date object in it-IT locale Europe/Rome timezone", () => {
    const date = new Date("2026-05-15T19:00:00Z"); // 21:00 Europe/Rome
    const out = formatEventDate(date);
    expect(out).toMatch(/15.*mag/i);
    expect(out).toContain("2026");
    expect(out).toMatch(/21:00/);
  });

  it("formats an ISO string equivalently to the same Date", () => {
    const iso = "2026-05-15T19:00:00Z";
    const fromIso = formatEventDate(iso);
    const fromDate = formatEventDate(new Date(iso));
    expect(fromIso).toBe(fromDate);
  });

  it("returns empty string for invalid input", () => {
    expect(formatEventDate("not-a-date")).toBe("");
    expect(formatEventDate(new Date("invalid"))).toBe("");
  });
});
