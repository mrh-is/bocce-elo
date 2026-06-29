import { describe, expect, it, vi } from "vitest";
import { buildLeaguePageData } from "../lib/league.js";

const baseConfig = {
  weekTabs: ["Week 1"],
  upcomingTab: "Week 2",
  summaryTab: "Standings",
  rankingsNameCol: 3,
  rankingsRankCol: 1,
  seasonLabel: "Season Test",
  sheetUrl: "https://example.test/sheet",
  myTeam: "Alpha",
  now: new Date("2026-06-29T12:00:00.000Z"),
};

describe("buildLeaguePageData", () => {
  it("builds complete page data from already-fetched tab rows", () => {
    const pageData = buildLeaguePageData(
      {
        Standings: [
          ["", "RANKING", "", "TEAM"],
          ["", "1", "", "Alpha"],
          ["", "2", "", "Beta"],
          ["", "3", "", "Gamma"],
        ],
        "Week 1": [
          ["", "1", "Alpha", "21", "Beta", "11"],
          ["", "2", "Gamma", "21", "Beta", "19"],
        ],
        "Week 2": [["", "1", "Alpha", "", "Gamma", ""]],
      },
      baseConfig,
    );

    expect(pageData).toMatchObject({
      seasonLabel: "Season Test",
      lastUpdated: new Date("2026-06-29T12:00:00.000Z"),
      sheetUrl: "https://example.test/sheet",
      myTeam: "Alpha",
    });
    expect(pageData.leaderboard.map((team) => team.name)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
    expect(pageData.leaderboard[0]).toMatchObject({
      name: "Alpha",
      officialRank: 1,
      rankDiff: 0,
      wins: 1,
      losses: 0,
      isMyTeam: true,
    });
    expect(pageData.leaderboard[0].upcoming).toEqual([
      {
        opponent: "Gamma",
        prob: expect.any(Number),
        court: "1",
      },
    ]);
  });

  it("uses the latest week tab as upcoming data when no explicit upcoming tab is configured", () => {
    const pageData = buildLeaguePageData(
      {
        Standings: [
          ["", "RANKING", "", "TEAM"],
          ["", "1", "", "Alpha"],
          ["", "2", "", "Beta"],
        ],
        "Week 1": [["", "1", "Alpha", "", "Beta", ""]],
      },
      {
        ...baseConfig,
        upcomingTab: null,
      },
    );

    expect(pageData.leaderboard[0].upcoming).toEqual([
      {
        opponent: "Beta",
        prob: 50,
        court: "1",
      },
    ]);
  });

  it("includes teams in standings that have no completed matches at 1000 ELO with 0-0-0 record", () => {
    const pageData = buildLeaguePageData(
      {
        Standings: [
          ["", "RANKING", "", "TEAM"],
          ["", "1", "", "Alpha"],
          ["", "2", "", "Beta"],
          ["", "3", "", "Gamma"],
        ],
        "Week 1": [["", "1", "Alpha", "21", "Beta", "11"]],
        "Week 2": [],
      },
      baseConfig,
    );

    const gamma = pageData.leaderboard.find((t) => t.name === "Gamma");
    expect(gamma).toMatchObject({
      name: "Gamma",
      elo: 1000,
      wins: 0,
      losses: 0,
      ties: 0,
      officialRank: 3,
    });
  });

  it("does not call fetch while transforming rows into page data", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    buildLeaguePageData(
      {
        Standings: [
          ["", "RANKING", "", "TEAM"],
          ["", "1", "", "Alpha"],
          ["", "2", "", "Beta"],
        ],
        "Week 1": [["", "1", "Alpha", "21", "Beta", "11"]],
        "Week 2": [["", "1", "Alpha", "", "Beta", ""]],
      },
      baseConfig,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rank field reflects ELO position, independent of row order (which follows official rank)", () => {
    // Alpha beats Beta; official standings rank Beta #1, Alpha #2
    // Rows are ordered Beta, Alpha — but rank fields should be Alpha=1, Beta=2 by ELO
    const pageData = buildLeaguePageData(
      {
        Standings: [
          ["", "RANKING", "", "TEAM"],
          ["", "1", "", "Beta"],
          ["", "2", "", "Alpha"],
        ],
        "Week 1": [["", "1", "Alpha", "21", "Beta", "11"]],
        "Week 2": [],
      },
      { ...baseConfig, upcomingTab: null },
    );

    // Rows are in official rank order: Beta first, then Alpha
    expect(pageData.leaderboard[0].name).toBe("Beta");
    expect(pageData.leaderboard[1].name).toBe("Alpha");
    // But the rank field is ELO rank: Alpha won so Alpha is ELO rank 1
    expect(pageData.leaderboard.find((t) => t.name === "Alpha")!.rank).toBe(1);
    expect(pageData.leaderboard.find((t) => t.name === "Beta")!.rank).toBe(2);
  });
});
