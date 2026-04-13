import { describe, it, expect } from "vitest";
import { contactSchema } from "./validations";

describe("contactSchema", () => {
  const validData = {
    name: "Mario Rossi",
    date: "14 aprile",
    guests: 4,
    message: "Tavolo vicino al palco",
  };

  it("should accept valid data", () => {
    const result = contactSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should accept data without message", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { message: _msg, ...withoutMessage } = validData;
    const result = contactSchema.safeParse(withoutMessage);
    expect(result.success).toBe(true);
  });

  it("should trim whitespace from strings", () => {
    const result = contactSchema.safeParse({
      ...validData,
      name: "  Mario  ",
      date: " 14 aprile ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mario");
      expect(result.data.date).toBe("14 aprile");
    }
  });

  it("should coerce guests from string to number", () => {
    const result = contactSchema.safeParse({
      ...validData,
      guests: "4",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guests).toBe(4);
    }
  });

  it("should reject empty name", () => {
    const result = contactSchema.safeParse({ ...validData, name: "" });
    expect(result.success).toBe(false);
  });

  it("should reject name over 100 characters", () => {
    const result = contactSchema.safeParse({
      ...validData,
      name: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject guests below 1", () => {
    const result = contactSchema.safeParse({ ...validData, guests: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject guests above 20", () => {
    const result = contactSchema.safeParse({ ...validData, guests: 21 });
    expect(result.success).toBe(false);
  });

  it("should reject message over 500 characters", () => {
    const result = contactSchema.safeParse({
      ...validData,
      message: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should pass through honeypot field", () => {
    const result = contactSchema.safeParse({
      ...validData,
      website: "http://spam.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe("http://spam.com");
    }
  });

  it("should allow empty honeypot field", () => {
    const result = contactSchema.safeParse({
      ...validData,
      website: "",
    });
    expect(result.success).toBe(true);
  });
});
