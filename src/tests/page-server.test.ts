import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/env/public", () => ({
  PUBLIC_GOOGLE_API_KEY: "api-key",
  PUBLIC_SHEET_ID: "sheet-id",
}));

vi.mock("#lib/config.js", () => ({
  WEEK_TABS: ["Week 1"],
  UPCOMING_TAB: "Week 2",
  SUMMARY_TAB: "Standings",
  RANKINGS_NAME_COL: 3,
  RANKINGS_RANK_COL: 1,
  SEASON_LABEL: "Season Test",
  SHEET_URL: "https://example.test/sheet",
  MY_TEAM: "Alpha",
}));

const fetchTabsMock = vi.hoisted(() => vi.fn());

vi.mock("#lib/sheets.js", async () => {
  const actual = await vi.importActual<typeof import("../lib/sheets.js")>( // eslint-disable-line @typescript-eslint/consistent-type-imports
    "../lib/sheets.js",
  );
  return {
    ...actual,
    fetchTabs: fetchTabsMock,
  };
});

const rowsByTab = {
  Standings: [
    ["", "RANKING", "", "TEAM"],
    ["", "1", "", "Alpha"],
    ["", "2", "", "Beta"],
  ],
  "Week 1": [["", "1", "Alpha", "21", "Beta", "11"]],
  "Week 2": [["", "1", "Alpha", "", "Beta", ""]],
};

describe("page server load caching", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchTabsMock.mockReset();
  });

  it("deduplicates concurrent cold loads into one Sheets request", async () => {
    fetchTabsMock.mockResolvedValue(rowsByTab);
    const { load } = await import("../routes/+page.server.js");

    const [first, second] = await Promise.all([load(), load()]);

    expect(fetchTabsMock).toHaveBeenCalledTimes(1);
    expect(first.leaderboard).toEqual(second.leaderboard);
  });

  it("returns stale cached data when refresh fails", async () => {
    fetchTabsMock.mockResolvedValueOnce(rowsByTab);
    const { load, __testing } = await import("../routes/+page.server.js");

    const first = await load();
    __testing.expireCache();
    fetchTabsMock.mockRejectedValueOnce(new Error("network down"));

    await expect(load()).resolves.toEqual(first);
  });
});
