import { afterEach, describe, it, expect, vi } from "vitest";
import {
  parseMatch,
  parseMatchTab,
  parseCanonicalTeams,
  parseOfficialRankings,
  parseMatchupsWithCourts,
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
      kind: "scored",
      teamA: "Team Alpha",
      teamB: "Team Beta",
      scoreA: 21,
      scoreB: 14,
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
      kind: "scored",
      teamA: "Team Gamma",
      teamB: "Team Delta",
      scoreA: 18,
      scoreB: 21,
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
      kind: "forfeit",
      teamA: "Team Alpha",
      teamB: "Team Beta",
      forfeitingTeam: "A",
    });
  });

  it("handles forfeit on score B", () => {
    const row = ["1", "Team Alpha", "21", "Team Beta", "F"];
    expect(parseMatch(row, 0)).toEqual({
      kind: "forfeit",
      teamA: "Team Alpha",
      teamB: "Team Beta",
      forfeitingTeam: "B",
    });
  });

  it("returns null when row is too short for given colOffset", () => {
    const row = ["1", "Team Alpha", "21", "Team Beta", "14"];
    expect(parseMatch(row, 5)).toBeNull();
  });

  it("rejects score cells with trailing non-numeric characters", () => {
    const row = ["1", "Team Alpha", "21abc", "Team Beta", "14"];
    expect(parseMatch(row, 0)).toBeNull();
  });

  it("rejects decimal score cells", () => {
    const row = ["1", "Team Alpha", "20.5", "Team Beta", "14"];
    expect(parseMatch(row, 0)).toBeNull();
  });

  it("rejects negative score cells", () => {
    const row = ["1", "Team Alpha", "-1", "Team Beta", "14"];
    expect(parseMatch(row, 0)).toBeNull();
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
    expect(matches[3].kind).toBe("forfeit");
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

describe("parseMatchupsWithCourts", () => {
  it("extracts courts from both left and right game blocks", () => {
    // Row layout: [blank, court, leftA, blank, leftB, blank, blank, rightA, blank, rightB, blank]
    const rows = [
      ["", "1", "Alpha", "", "Beta", "", "", "Gamma", "", "Delta", ""],
      ["", "2", "Epsilon", "", "Zeta", "", "", "Eta", "", "Theta", ""],
    ];
    const matchups = parseMatchupsWithCourts(rows);
    expect(matchups).toHaveLength(4);
    // Left matchups come first
    expect(matchups[0]).toEqual({ teamA: "Alpha", teamB: "Beta", court: "1" });
    expect(matchups[1]).toEqual({
      teamA: "Epsilon",
      teamB: "Zeta",
      court: "2",
    });
    // Right matchups follow
    expect(matchups[2]).toEqual({ teamA: "Gamma", teamB: "Delta", court: "1" });
    expect(matchups[3]).toEqual({ teamA: "Eta", teamB: "Theta", court: "2" });
  });

  it("skips incomplete matchups missing one team name", () => {
    const rows = [
      ["", "1", "Alpha", "", "", "", "", "Gamma", "", "Delta", ""],
      ["", "2", "Epsilon", "", "Zeta", "", "", "", "", "Theta", ""],
    ];
    const matchups = parseMatchupsWithCourts(rows);
    // Alpha/blank skipped, Epsilon/Zeta kept, Gamma/Delta kept, blank/Theta skipped
    expect(matchups).toHaveLength(2);
    expect(matchups[0]).toEqual({
      teamA: "Epsilon",
      teamB: "Zeta",
      court: "2",
    });
    expect(matchups[1]).toEqual({ teamA: "Gamma", teamB: "Delta", court: "1" });
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

  it("aborts the Sheets request when the timeout elapses", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        const p = new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          });
        });
        // Attach a no-op handler so Node.js does not emit an unhandledRejection
        // warning before the await in fetchTabs catches the rejection.
        p.catch((_e) => undefined);
        return p;
      },
    );

    const promise = fetchTabs("sheet-id", "api-key", ["Standings"], {
      timeoutMs: 100,
    });
    // Pre-attach a no-op handler so Node.js does not flag the fetchTabs promise
    // as unhandled before expect().rejects attaches its own handler.
    promise.catch((_e) => undefined);

    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).rejects.toThrow("Sheets API request timed out");
    vi.useRealTimers();
  });
});
