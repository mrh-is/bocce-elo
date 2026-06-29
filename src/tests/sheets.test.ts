import { afterEach, describe, it, expect, vi } from "vitest";
import {
  parseMatch,
  parseMatchTab,
  parseCanonicalTeams,
  parseOfficialRankings,
  fetchTab,
  fetchTabs,
} from "../lib/sheets.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseMatch", () => {
  it("parses a normal game from left block (colOffset=0)", () => {
    const row = [
      "1",
      "Team Alpha",
      "21",
      "Team Beta",
      "14",
      "",
      "2",
      "Team Gamma",
      "18",
      "Team Delta",
      "21",
    ];
    expect(parseMatch(row, 0)).toEqual({
      teamA: "Team Alpha",
      teamB: "Team Beta",
      scoreA: 21,
      scoreB: 14,
      forfeitA: false,
      forfeitB: false,
    });
  });

  it("parses a normal game from right block (colOffset=5)", () => {
    // Row layout: [court, teamA, scoreA, teamB, scoreB, blank, teamA2, scoreA2, teamB2, scoreB2]
    // Right block has NO second court# column — blank is at index 5, teamA2 at index 6.
    const row = [
      "1",
      "Team Alpha",
      "21",
      "Team Beta",
      "14",
      "",
      "Team Gamma",
      "18",
      "Team Delta",
      "21",
    ];
    expect(parseMatch(row, 5)).toEqual({
      teamA: "Team Gamma",
      teamB: "Team Delta",
      scoreA: 18,
      scoreB: 21,
      forfeitA: false,
      forfeitB: false,
    });
  });

  it("returns null when team name is missing", () => {
    const row = ["1", "", "21", "Team Beta", "14"];
    expect(parseMatch(row, 0)).toBeNull();
  });

  it("returns null when scores are missing (blank, not forfeit)", () => {
    const row = ["1", "Team Alpha", "", "Team Beta", ""];
    expect(parseMatch(row, 0)).toBeNull();
  });

  it("handles forfeit on score A", () => {
    const row = ["1", "Team Alpha", "F", "Team Beta", "21"];
    expect(parseMatch(row, 0)).toEqual({
      teamA: "Team Alpha",
      teamB: "Team Beta",
      scoreA: null,
      scoreB: null,
      forfeitA: true,
      forfeitB: false,
    });
  });

  it("handles forfeit on score B", () => {
    const row = ["1", "Team Alpha", "21", "Team Beta", "F"];
    expect(parseMatch(row, 0)).toEqual({
      teamA: "Team Alpha",
      teamB: "Team Beta",
      scoreA: null,
      scoreB: null,
      forfeitA: false,
      forfeitB: true,
    });
  });

  it("returns null when row is too short for given colOffset", () => {
    const row = ["1", "Team Alpha", "21", "Team Beta", "14"];
    expect(parseMatch(row, 5)).toBeNull();
  });
});

describe("parseMatchTab", () => {
  it("extracts matches from both blocks across multiple rows", () => {
    // Actual sheet layout: [blank, court#, tA, sA, tB, sB, blank, tA2, sA2, tB2, sB2]
    const rows = [
      ["", "1", "Alpha", "21", "Beta", "14", "", "Gamma", "18", "Delta", "21"],
      [], // blank row — skip
      ["", "3", "Epsilon", "21", "Zeta", "10", "", "Eta", "F", "Theta", "21"],
    ];
    const matches = parseMatchTab(rows);
    expect(matches).toHaveLength(4);
    expect(matches[0].teamA).toBe("Alpha");
    expect(matches[1].teamA).toBe("Gamma");
    expect(matches[3].forfeitA).toBe(true);
    expect(matches[3].teamA).toBe("Eta");
  });

  it("skips header row (GAME 1 / GAME 2) gracefully", () => {
    // The Sheets API returns the header row; teamB slot is blank → returns null
    const rows = [["", "GAME 1", "", "", "", "", "GAME 2", "", "", ""]];
    expect(parseMatchTab(rows)).toHaveLength(0);
  });

  it("skips a block when both score cells are blank", () => {
    const rows = [["", "1", "Alpha", "", "Beta", ""]];
    expect(parseMatchTab(rows)).toHaveLength(0);
  });
});

describe("parseCanonicalTeams", () => {
  it("returns unique trimmed names from the configured column after the header", () => {
    const rows = [
      ["", "RANKING", "", "TEAM"],
      ["", "1", "", " Alpha "],
      ["", "2", "", "Beta"],
      ["", "3", "", "Alpha"],
      ["", "4", "", ""],
    ];

    expect(parseCanonicalTeams(rows, 3)).toEqual(["Alpha", "Beta"]);
  });
});

describe("parseOfficialRankings", () => {
  it("maps team names to numeric ranks and skips invalid rows", () => {
    const rows = [
      ["", "RANKING", "", "TEAM"],
      ["", "1", "", "Alpha"],
      ["", "2", "", " Beta "],
      ["", "not-a-rank", "", "Gamma"],
      ["", "4", "", ""],
    ];

    expect(parseOfficialRankings(rows, 3, 1)).toEqual({
      Alpha: 1,
      Beta: 2,
    });
  });
});

describe("fetchTabs", () => {
  it("fetches multiple unique tabs with one batchGet request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        valueRanges: [
          { range: "Standings!A1:Z", values: [["standings"]] },
          { range: "'Week 1'!A1:Z", values: [["week1"]] },
        ],
      }),
    } as Response);

    const rowsByTab = await fetchTabs("sheet-id", "api-key", [
      "Standings",
      "Week 1",
      "Week 1",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/v4/spreadsheets/sheet-id/values:batchGet");
    expect(url.searchParams.getAll("ranges")).toEqual(["Standings", "Week 1"]);
    expect(url.searchParams.get("key")).toBe("api-key");
    expect(rowsByTab).toEqual({
      Standings: [["standings"]],
      "Week 1": [["week1"]],
    });
  });

  it("returns an empty map without calling fetch when no tabs are requested", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(fetchTabs("sheet-id", "api-key", [])).resolves.toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a helpful error when batchGet fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    } as Response);

    await expect(
      fetchTabs("sheet-id", "api-key", ["Standings", "Week 1"]),
    ).rejects.toThrow(
      'Sheets API error for tabs "Standings", "Week 1": 403 Forbidden',
    );
  });
});

describe("fetchTab", () => {
  it("uses the batch fetcher shape for one tab", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        valueRanges: [{ range: "Standings!A1:Z", values: [["row"]] }],
      }),
    } as Response);

    await expect(fetchTab("sheet-id", "api-key", "Standings")).resolves.toEqual(
      [["row"]],
    );
  });
});
