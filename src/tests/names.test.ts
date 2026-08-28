import { describe, it, expect } from "vitest";
import { normalize, canonicalize } from "../lib/names.js";

describe("normalize", () => {
  it("lowercases, converts & to 'and', and strips punctuation", () => {
    expect(normalize("Walter & the Bocce Bunch")).toBe(
      "walter and the bocce bunch",
    );
  });
  it("treats & identically to 'and'", () => {
    expect(normalize("Goose Shits & Giggles")).toBe(
      normalize("Goose Shits and Giggles"),
    );
    expect(normalize("Bangin' & Bumpin'")).toBe(
      normalize("Bangin' and Bumpin'"),
    );
  });
  it("trims whitespace", () => {
    expect(normalize("  Boccegenius  ")).toBe("boccegenius");
  });
  it("preserves digits", () => {
    expect(normalize("Matchballz 20")).toBe("matchballz 20");
  });
});

describe("canonicalize", () => {
  const canonical = [
    "Bachelor's Degree in Bocce",
    "Balls Not Included",
    "Bangin' and Bumpin'",
    "Bocce Snatchers",
    "Deep Throwed It",
    "Florals? For Bocce?",
    "Gay De-Bocce-ry",
    "Goose Shits and Giggles",
    "I Wanna Dance with Somebocce",
    "Irritable Bocce Syndrome",
    "It's Bocce, Bitch",
    "Itty Bitty Bocce Committee",
    "Orange is the New Bocce",
    "Professional Ball Handlers",
    "Rolling with my Homos",
    "She Doesn't Even Throw Here",
    "Son of a Be-occe",
    "Teeny Weenie Pallinis",
    "Thankful Grateful Blessed",
    "Walter & the Bocce Bunch",
    "boccegenius",
  ];

  it("resolves known aliases", () => {
    // Truncations
    expect(canonicalize("Teeny Weenie", canonical)).toBe(
      "Teeny Weenie Pallinis",
    );
    expect(canonicalize("Itty Bitty Bocce", canonical)).toBe(
      "Itty Bitty Bocce Committee",
    );
    expect(canonicalize("She Doesnt Even", canonical)).toBe(
      "She Doesn't Even Throw Here",
    );
    expect(canonicalize("I Wanna Dance W", canonical)).toBe(
      "I Wanna Dance with Somebocce",
    );
    expect(canonicalize("Walter and the Bocce", canonical)).toBe(
      "Walter & the Bocce Bunch",
    );
    // Typos
    expect(canonicalize("Deeped Throwed It", canonical)).toBe(
      "Deep Throwed It",
    );
    expect(canonicalize("Irratable Bocce Syndrome", canonical)).toBe(
      "Irritable Bocce Syndrome",
    );
    expect(canonicalize("Son of Beocce", canonical)).toBe("Son of a Be-occe");
    // Alternate spellings from week tabs
    expect(canonicalize("I Wanna Dance w/Some Bocce", canonical)).toBe(
      "I Wanna Dance with Somebocce",
    );
    expect(canonicalize("I Wanna Dance With Some Bocce", canonical)).toBe(
      "I Wanna Dance with Somebocce",
    );
  });

  it("resolves & vs 'and' mismatches via normalize()", () => {
    expect(canonicalize("Goose Shits & Giggles", canonical)).toBe(
      "Goose Shits and Giggles",
    );
    expect(canonicalize("Bangin' & Bumpin'", canonical)).toBe(
      "Bangin' and Bumpin'",
    );
  });

  it("resolves via normalize() alone (no explicit alias needed)", () => {
    expect(canonicalize("Gay Deboccery", canonical)).toBe("Gay De-Bocce-ry");
    expect(canonicalize("Florals For Bocce", canonical)).toBe(
      "Florals? For Bocce?",
    );
    expect(canonicalize("Its Bocce Bitch", canonical)).toBe(
      "It's Bocce, Bitch",
    );
  });

  it("matches exact canonical name case-insensitively", () => {
    expect(canonicalize("boccegenius", canonical)).toBe("boccegenius");
    expect(canonicalize("BOCCEGENIUS", canonical)).toBe("boccegenius");
  });

  it("resolves truncated names via prefix matching", () => {
    expect(canonicalize("Itty Bitty Bocce Co", canonical)).toBe(
      "Itty Bitty Bocce Committee",
    );
    expect(canonicalize("Professional Ball H", canonical)).toBe(
      "Professional Ball Handlers",
    );
    expect(canonicalize("Thankful Grateful B", canonical)).toBe(
      "Thankful Grateful Blessed",
    );
  });

  it("does not prefix-match when input is too short", () => {
    const result = canonicalize("Bocce", canonical);
    expect(result).toBe("Bocce");
  });

  it("does not prefix-match when multiple canonical names match", () => {
    const ambiguous = [...canonical, "Itty Bitty Bocce Crew"];
    const result = canonicalize("Itty Bitty Bocce C", ambiguous);
    expect(result).toBe("Itty Bitty Bocce C");
  });

  it("returns name as-is when not found (and logs warning)", () => {
    const result = canonicalize("Unknown Team", canonical);
    expect(result).toBe("Unknown Team");
  });
});
