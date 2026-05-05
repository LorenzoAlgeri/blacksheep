import { describe, it, expect } from "vitest";
import { isSubscriberUnsubscribable } from "./subscriber-status";

describe("isSubscriberUnsubscribable", () => {
  it("returns false for blocked subscribers — bug #2 regression: blocked must not escape via email link", () => {
    expect(isSubscriberUnsubscribable("blocked")).toBe(false);
  });

  it("returns true for pending subscribers", () => {
    expect(isSubscriberUnsubscribable("pending")).toBe(true);
  });

  it("returns true for confirmed subscribers", () => {
    expect(isSubscriberUnsubscribable("confirmed")).toBe(true);
  });

  it("returns true for already-unsubscribed subscribers", () => {
    expect(isSubscriberUnsubscribable("unsubscribed")).toBe(true);
  });
});
