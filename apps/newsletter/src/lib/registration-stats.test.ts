import { describe, it, expect } from "vitest";
import { calculateStats } from "./registration-stats";
import type { Registration } from "./registration-stats";

function reg(status: string | null, gender: string | null): Registration {
  return { subscriber: { status, gender } };
}

describe("calculateStats", () => {
  it("returns zeros for empty array", () => {
    const stats = calculateStats([]);
    expect(stats).toEqual({
      total: 0,
      confirmed: 0,
      pending: 0,
      women: 0,
      men: 0,
      womenConfirmed: 0,
    });
  });

  it("counts all confirmed correctly", () => {
    const regs = [reg("confirmed", "female"), reg("confirmed", "male"), reg("confirmed", "female")];
    const stats = calculateStats(regs);
    expect(stats.total).toBe(3);
    expect(stats.confirmed).toBe(3);
    expect(stats.pending).toBe(0);
    expect(stats.women).toBe(2);
    expect(stats.men).toBe(1);
    expect(stats.womenConfirmed).toBe(2);
  });

  it("handles mixed confirmed/pending with gender", () => {
    const regs = [
      reg("confirmed", "female"),
      reg("pending", "female"),
      reg("confirmed", "male"),
      reg("pending", "male"),
    ];
    const stats = calculateStats(regs);
    expect(stats.total).toBe(4);
    expect(stats.confirmed).toBe(2);
    expect(stats.pending).toBe(2);
    expect(stats.women).toBe(2);
    expect(stats.men).toBe(2);
    expect(stats.womenConfirmed).toBe(1);
  });

  it("handles gender NULL (legacy subscribers)", () => {
    const regs = [reg("confirmed", null), reg("pending", null)];
    const stats = calculateStats(regs);
    expect(stats.total).toBe(2);
    expect(stats.women).toBe(0);
    expect(stats.men).toBe(0);
    expect(stats.womenConfirmed).toBe(0);
  });

  it("handles null subscriber (defensive)", () => {
    const regs: Registration[] = [{ subscriber: null }];
    const stats = calculateStats(regs);
    expect(stats.total).toBe(1);
    expect(stats.confirmed).toBe(0);
    expect(stats.pending).toBe(1);
    expect(stats.women).toBe(0);
  });

  it("womenConfirmed counts only confirmed women, not pending women", () => {
    const regs = [reg("confirmed", "female"), reg("pending", "female"), reg("pending", "female")];
    const stats = calculateStats(regs);
    expect(stats.women).toBe(3);
    expect(stats.womenConfirmed).toBe(1);
  });
});
