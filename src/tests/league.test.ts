import { describe, expect, it } from "vitest";
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
      lastUpdated: "2026-06-29T12:00:00.000Z",
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
});
