import { describe, it, expect } from "vitest";
import { validateEmail } from "./email-validation";

describe("validateEmail — format validation", () => {
  it("returns invalid_format for empty string", () => {
    expect(validateEmail("")).toEqual({ kind: "invalid_format" });
  });

  it("returns invalid_format when @ is missing", () => {
    expect(validateEmail("missing-at")).toEqual({ kind: "invalid_format" });
  });

  it("returns invalid_format when domain is missing", () => {
    expect(validateEmail("@nodomain")).toEqual({ kind: "invalid_format" });
  });

  it("returns valid for a well-formed gmail address", () => {
    expect(validateEmail("valid@gmail.com")).toEqual({ kind: "valid" });
  });
});

describe("validateEmail — no suggestion for unknown/custom domains", () => {
  it("returns valid (no suggestion) for unknown domain far from whitelist", () => {
    expect(validateEmail("valid@example.com")).toEqual({ kind: "valid" });
  });

  it("returns valid (no suggestion) for custom domain with .io TLD", () => {
    expect(validateEmail("company@custom-domain.io")).toEqual({ kind: "valid" });
  });
});

describe("validateEmail — TLD typo suggestions", () => {
  it("suggests gmail.com for gmail.con (TLD typo)", () => {
    const result = validateEmail("khadyy.diopp@gmail.con");
    expect(result).toMatchObject({
      kind: "suggestion",
      suggested: "khadyy.diopp@gmail.com",
      reason: "tld",
    });
  });

  it("suggests gmail.com for gmail.co (truncated TLD)", () => {
    const result = validateEmail("mbackeloufa07@gmail.co");
    expect(result).toMatchObject({
      kind: "suggestion",
      suggested: "mbackeloufa07@gmail.com",
      reason: "tld",
    });
  });

  it("suggests yahoo.it for yhoo.it (domain typo, IT TLD matches)", () => {
    const result = validateEmail("test@yhoo.it");
    expect(result).toMatchObject({
      kind: "suggestion",
      suggested: "test@yahoo.it",
      reason: "domain",
    });
  });
});

describe("validateEmail — domain typo suggestions", () => {
  it("suggests gmail.com for gmali.com (transposition typo)", () => {
    const result = validateEmail("mbabanemouhamed23@gmali.com");
    expect(result).toMatchObject({
      kind: "suggestion",
      suggested: "mbabanemouhamed23@gmail.com",
      reason: "domain",
    });
  });

  it("suggests gmail.com for gnail.com (substitution typo)", () => {
    const result = validateEmail("obahadinebara011@gnail.com");
    expect(result).toMatchObject({
      kind: "suggestion",
      suggested: "obahadinebara011@gmail.com",
      reason: "domain",
    });
  });

  it("suggests gmail.com for hmail.com (closest by Levenshtein)", () => {
    const result = validateEmail("andrianwk99@hmail.com");
    expect(result).toMatchObject({
      kind: "suggestion",
      suggested: "andrianwk99@gmail.com",
      reason: "domain",
    });
  });

  it("suggests libero.it for libreo.it (transposition typo)", () => {
    const result = validateEmail("test@libreo.it");
    expect(result).toMatchObject({
      kind: "suggestion",
      suggested: "test@libero.it",
      reason: "domain",
    });
  });
});

describe("validateEmail — exact whitelist matches return valid", () => {
  it.each([
    "a@gmail.com",
    "b@hotmail.it",
    "c@libero.it",
    "d@yahoo.it",
    "e@outlook.com",
    "f@icloud.com",
    "g@virgilio.it",
    "h@tiscali.it",
  ])("returns valid for %s", (email) => {
    expect(validateEmail(email)).toEqual({ kind: "valid" });
  });
});

describe("validateEmail — preserves original casing in suggestion", () => {
  it("returns suggestion with original email preserved and suggested lowercased", () => {
    const result = validateEmail("User@gmail.con");
    expect(result).toMatchObject({
      kind: "suggestion",
      original: "User@gmail.con",
      suggested: "user@gmail.com",
    });
  });
});

describe("validateEmail — disposable email blocking", () => {
  it("returns disposable for mailinator.com", () => {
    const result = validateEmail("user@mailinator.com");
    expect(result).toEqual({ kind: "disposable", domain: "mailinator.com" });
  });

  it("returns disposable for yopmail.com", () => {
    const result = validateEmail("hello@yopmail.com");
    expect(result).toEqual({ kind: "disposable", domain: "yopmail.com" });
  });

  it("returns disposable for 10minutemail.com", () => {
    const result = validateEmail("temp@10minutemail.com");
    expect(result).toEqual({ kind: "disposable", domain: "10minutemail.com" });
  });

  it("returns disposable for guerrillamail.com", () => {
    const result = validateEmail("anon@guerrillamail.com");
    expect(result).toEqual({ kind: "disposable", domain: "guerrillamail.com" });
  });

  it("returns disposable for trashmail.com", () => {
    const result = validateEmail("test@trashmail.com");
    expect(result).toEqual({ kind: "disposable", domain: "trashmail.com" });
  });

  it("returns disposable for temp-mail.org", () => {
    const result = validateEmail("test@temp-mail.org");
    expect(result).toEqual({ kind: "disposable", domain: "temp-mail.org" });
  });

  it("returns disposable for maildrop.cc", () => {
    const result = validateEmail("anon@maildrop.cc");
    expect(result).toEqual({ kind: "disposable", domain: "maildrop.cc" });
  });

  it("does NOT flag gmail.com as disposable", () => {
    const result = validateEmail("real@gmail.com");
    expect(result.kind).not.toBe("disposable");
  });

  it("does NOT flag hotmail.com as disposable", () => {
    const result = validateEmail("real@hotmail.com");
    expect(result.kind).not.toBe("disposable");
  });

  it("disposable check takes priority over suggestion check", () => {
    // mailinator.com is disposable; if checked after suggestion it might try to match
    const result = validateEmail("user@mailinator.com");
    expect(result.kind).toBe("disposable");
    expect(result).not.toHaveProperty("suggested");
  });
});
