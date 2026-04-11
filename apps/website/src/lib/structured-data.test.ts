import { describe, it, expect } from "vitest";
import { getEventStructuredData, getOrganizationStructuredData } from "./structured-data";

describe("getEventStructuredData", () => {
  it("should return a valid MusicEvent schema", () => {
    const data = getEventStructuredData();
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("MusicEvent");
    expect(data.name).toBe("BLACK SHEEP Monday");
  });

  it("should include location details", () => {
    const data = getEventStructuredData();
    expect(data.location["@type"]).toBe("NightClub");
    expect(data.location.name).toBe("11 Clubroom");
    expect(data.location.address.addressLocality).toBe("Milano");
  });

  it("should include performers", () => {
    const data = getEventStructuredData();
    expect(data.performer).toHaveLength(3);
    expect(data.performer[0]["@type"]).toBe("MusicGroup");
  });

  it("should have valid ISO date strings", () => {
    const data = getEventStructuredData();
    expect(() => new Date(data.startDate)).not.toThrow();
    expect(() => new Date(data.endDate)).not.toThrow();
    expect(new Date(data.endDate).getTime()).toBeGreaterThan(new Date(data.startDate).getTime());
  });
});

describe("getOrganizationStructuredData", () => {
  it("should return a valid Organization schema", () => {
    const data = getOrganizationStructuredData();
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("Black Sheep Community");
  });

  it("should include social media links", () => {
    const data = getOrganizationStructuredData();
    expect(data.sameAs.length).toBeGreaterThan(0);
    expect(data.sameAs.some((url: string) => url.includes("instagram"))).toBe(true);
  });
});
