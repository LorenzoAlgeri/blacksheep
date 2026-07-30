import { describe, it, expect } from "vitest";
import { tallyEventCounts } from "./registration-counts";

describe("tallyEventCounts", () => {
  it("counts registrations per subscriber across events", () => {
    const counts = tallyEventCounts([
      { subscriber_id: "a" },
      { subscriber_id: "b" },
      { subscriber_id: "a" },
      { subscriber_id: "a" },
      { subscriber_id: "b" },
    ]);
    expect(counts.get("a")).toBe(3);
    expect(counts.get("b")).toBe(2);
  });

  it("returns an empty map for no rows", () => {
    expect(tallyEventCounts([]).size).toBe(0);
  });

  it("ignores rows with a null subscriber_id (defensive)", () => {
    const counts = tallyEventCounts([{ subscriber_id: null }, { subscriber_id: "x" }]);
    expect(counts.has("x")).toBe(true);
    expect(counts.get("x")).toBe(1);
    expect(counts.size).toBe(1);
  });

  it("returns undefined for a subscriber with no registrations", () => {
    const counts = tallyEventCounts([{ subscriber_id: "a" }]);
    expect(counts.get("unknown")).toBeUndefined();
  });
});
