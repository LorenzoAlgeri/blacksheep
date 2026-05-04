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
