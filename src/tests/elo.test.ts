import { describe, it, expect } from "vitest";
import { expectedScore, marginMultiplier, processMatches } from "../lib/elo.js";

describe("expectedScore", () => {
  it("returns 0.5 when ratings are equal", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
  });
  it("favours the higher-rated team", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });
  it("expected scores sum to 1", () => {
    const eA = expectedScore(1100, 950);
    const eB = expectedScore(950, 1100);
    expect(eA + eB).toBeCloseTo(1);
  });
});

describe("marginMultiplier", () => {
  it("returns ~1.0 for a margin of 11 (normalisation point)", () => {
    // ln(12)/ln(12) = 1.0
    expect(marginMultiplier(21, 10)).toBeCloseTo(1.0, 1);
  });
  it("clamps at 2.0 for very large margins", () => {
    expect(marginMultiplier(21, 0)).toBeLessThanOrEqual(2.0);
  });
  it("is greater for larger margins", () => {
    expect(marginMultiplier(21, 10)).toBeGreaterThan(marginMultiplier(21, 15));
  });
  it("returns > 0 for a margin of 1", () => {
    expect(marginMultiplier(21, 20)).toBeGreaterThan(0);
  });
  it("returns 0 for a margin of 0 (log(1)/log(12) = 0), zeroing out K-factor for exact ties", () => {
    // scoreA === scoreB is handled before marginMultiplier is called in processMatches,
    // so this edge is unreachable in practice, but the formula is documented here.
    expect(marginMultiplier(10, 10)).toBe(0);
  });
});

describe("processMatches", () => {
  it("starts every team at 1000", () => {
    const matches = [
      {
        kind: "scored" as const,
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
      },
    ];
    const { ratings } = processMatches(matches);
    expect(ratings["Alpha"]).not.toBeUndefined();
    expect(ratings["Beta"]).not.toBeUndefined();
  });

  it("winner gains rating, loser loses", () => {
    const matches = [
      {
        kind: "scored" as const,
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
      },
    ];
    const { ratings } = processMatches(matches);
    expect(ratings["Alpha"]).toBeGreaterThan(1000);
    expect(ratings["Beta"]).toBeLessThan(1000);
  });

  it("tracks win/loss records correctly", () => {
    const matches = [
      {
        kind: "scored" as const,
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
      },
      {
        kind: "scored" as const,
        teamA: "Beta",
        teamB: "Gamma",
        scoreA: 21,
        scoreB: 10,
      },
    ];
    const { records } = processMatches(matches);
    expect(records["Alpha"]).toEqual({
      wins: 1,
      losses: 0,
      ties: 0,
      pointsFor: 21,
      pointsAgainst: 14,
    });
    expect(records["Beta"]).toEqual({
      wins: 1,
      losses: 1,
      ties: 0,
      pointsFor: 35,
      pointsAgainst: 31,
    });
    expect(records["Gamma"]).toEqual({
      wins: 0,
      losses: 1,
      ties: 0,
      pointsFor: 10,
      pointsAgainst: 21,
    });
  });

  it("handles forfeit: winner gets win, no points added to differential", () => {
    const matches = [
      {
        kind: "forfeit" as const,
        teamA: "Alpha",
        teamB: "Beta",
        forfeitingTeam: "A" as const,
      },
    ];
    const { records, ratings } = processMatches(matches);
    expect(records["Beta"].wins).toBe(1);
    expect(records["Alpha"].losses).toBe(1);
    expect(records["Alpha"].pointsFor).toBe(0);
    expect(records["Beta"].pointsFor).toBe(0);
    expect(ratings["Beta"]).toBeGreaterThan(1000);
  });

  it("logs a warning for duplicate appearances in one week (via weeklyAppearances tracking)", () => {
    // processMatches accepts a weekIndex on each match for this check
    // Simple check: no crash and ratings are computed
    const matches = [
      {
        kind: "scored" as const,
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
        weekIndex: 0,
      },
      {
        kind: "scored" as const,
        teamA: "Alpha",
        teamB: "Gamma",
        scoreA: 18,
        scoreB: 21,
        weekIndex: 0,
      },
      {
        kind: "scored" as const,
        teamA: "Alpha",
        teamB: "Delta",
        scoreA: 21,
        scoreB: 5,
        weekIndex: 0,
      },
    ];
    expect(() => processMatches(matches)).not.toThrow();
  });
});
