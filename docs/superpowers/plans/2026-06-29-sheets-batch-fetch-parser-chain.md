# Sheets Batch Fetch Parser Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the homepage data load so a cache miss makes one Google Sheets API request for all needed tabs, then hands the returned rows to a typed lib-level parser/transformer chain that returns the complete `PageData`.

**Architecture:** `src/lib/sheets.ts` owns raw Google Sheets access plus pure row parsers. New `src/lib/league.ts` owns bocce-domain transformation from tab rows to `PageData`: canonicalization, match extraction, Elo processing, upcoming probabilities, and leaderboard shaping. `src/routes/+page.server.ts` keeps only route cache logic, tab selection, one `fetchTabs` call, and one `buildLeaguePageData` call.

**Tech Stack:** TypeScript, SvelteKit server `load`, Google Sheets API `values:batchGet`, Vitest

---

## File Structure

- Modify: `src/lib/sheets.ts`
  - Add `fetchTabs(sheetId, apiKey, tabNames)` using `values:batchGet`.
  - Add pure `parseCanonicalTeams(rows, nameCol)` and `parseOfficialRankings(rows, nameCol, rankCol)`.
  - Keep existing row parsers: `parseMatchTab`, `parseMatchupsWithCourts`, `parseScheduledMatchTab`.
  - Keep `fetchTab` only as a backwards-compatible single-tab wrapper around `fetchTabs`.

- Create: `src/lib/league.ts`
  - Add `buildLeaguePageData(rowsByTab, config)` returning `PageData`.
  - Move `UpcomingMatchup`, upcoming indexing, leaderboard building, match parsing, and upcoming resolution out of `+page.server.ts`.
  - No network access in this file.

- Modify: `src/routes/+page.server.ts`
  - Keep TTL cache.
  - Compute a deduped tab list from `SUMMARY_TAB`, `WEEK_TABS`, and optional `UPCOMING_TAB`.
  - Call `fetchTabs` once.
  - Call `buildLeaguePageData`.

- Modify: `src/tests/sheets.test.ts`
  - Add tests for `fetchTabs`, `fetchTab`, `parseCanonicalTeams`, and `parseOfficialRankings`.

- Create: `src/tests/league.test.ts`
  - Add tests for `buildLeaguePageData` using in-memory tab rows.

---

### Task 1: Add Pure Summary Parsers

**Files:**

- Modify: `src/lib/sheets.ts`
- Modify: `src/tests/sheets.test.ts`

- [ ] **Step 1: Add failing parser tests**

Append these imports and tests in `src/tests/sheets.test.ts`.

```typescript
import { parseCanonicalTeams, parseOfficialRankings } from "../lib/sheets.js";

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
```

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm test -- src/tests/sheets.test.ts --reporter verbose
```

Expected: FAIL with TypeScript/import errors because `parseCanonicalTeams` and `parseOfficialRankings` are not exported.

- [ ] **Step 3: Implement pure parsers in `src/lib/sheets.ts`**

Add these functions below `parseMatchTab`.

```typescript
export function parseCanonicalTeams(
  rows: string[][],
  nameCol: number,
): string[] {
  const names = new Set<string>();
  for (const row of rows.slice(1)) {
    const name = row[nameCol]?.trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names];
}

export function parseOfficialRankings(
  rows: string[][],
  nameCol: number,
  rankCol: number,
): OfficialRankings {
  const rankings: OfficialRankings = {};
  for (const row of rows.slice(1)) {
    const name = row[nameCol]?.trim();
    const rank = parseInt(row[rankCol]?.trim(), 10);
    if (name && !isNaN(rank)) {
      rankings[name] = rank;
    }
  }
  return rankings;
}
```

- [ ] **Step 4: Update existing async helpers to call the pure parsers**

Replace the bodies of `getCanonicalTeams` and `getOfficialRankings` in `src/lib/sheets.ts`.

```typescript
export async function getCanonicalTeams(
  sheetId: string,
  apiKey: string,
  summaryTab: string,
  nameCol: number,
): Promise<string[]> {
  const rows = await fetchTab(sheetId, apiKey, summaryTab);
  return parseCanonicalTeams(rows, nameCol);
}

export async function getOfficialRankings(
  sheetId: string,
  apiKey: string,
  summaryTab: string,
  nameCol: number,
  rankCol: number,
): Promise<OfficialRankings> {
  const rows = await fetchTab(sheetId, apiKey, summaryTab);
  return parseOfficialRankings(rows, nameCol, rankCol);
}
```

- [ ] **Step 5: Run focused tests and verify pass**

```bash
npm test -- src/tests/sheets.test.ts --reporter verbose
```

Expected: PASS for all `sheets.test.ts` tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sheets.ts src/tests/sheets.test.ts
git commit -m "refactor(sheets): add pure summary parsers"
```

---

### Task 2: Add One-Request Multi-Tab Fetcher

**Files:**

- Modify: `src/lib/sheets.ts`
- Modify: `src/tests/sheets.test.ts`

- [ ] **Step 1: Add failing fetcher tests**

Append these tests to `src/tests/sheets.test.ts`.

```typescript
import { afterEach, vi } from "vitest";
import { fetchTab, fetchTabs } from "../lib/sheets.js";

afterEach(() => {
  vi.restoreAllMocks();
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
```

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm test -- src/tests/sheets.test.ts --reporter verbose
```

Expected: FAIL because `fetchTabs` is not exported and `fetchTab` still uses `values/{tab}`.

- [ ] **Step 3: Implement `fetchTabs` and rewrite `fetchTab`**

In `src/lib/sheets.ts`, replace the existing `fetchTab` implementation with this block.

```typescript
export type RowsByTab = Record<string, string[][]>;

interface BatchGetResponse {
  valueRanges?: { values?: string[][] }[];
}

export async function fetchTabs(
  sheetId: string,
  apiKey: string,
  tabNames: string[],
): Promise<RowsByTab> {
  const uniqueTabNames = [...new Set(tabNames)];
  if (uniqueTabNames.length === 0) {
    return {};
  }

  const params = new URLSearchParams({ key: apiKey });
  for (const tabName of uniqueTabNames) {
    params.append("ranges", tabName);
  }

  const url = `${SHEETS_BASE}/${sheetId}/values:batchGet?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Sheets API error for tabs ${uniqueTabNames.map((tab) => `"${tab}"`).join(", ")}: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as BatchGetResponse;
  const valueRanges = data.valueRanges ?? [];

  return Object.fromEntries(
    uniqueTabNames.map((tabName, index) => [
      tabName,
      valueRanges[index]?.values ?? [],
    ]),
  );
}

export async function fetchTab(
  sheetId: string,
  apiKey: string,
  tabName: string,
): Promise<string[][]> {
  const rowsByTab = await fetchTabs(sheetId, apiKey, [tabName]);
  return rowsByTab[tabName] ?? [];
}
```

- [ ] **Step 4: Run focused tests and verify pass**

```bash
npm test -- src/tests/sheets.test.ts --reporter verbose
```

Expected: PASS for all `sheets.test.ts` tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts src/tests/sheets.test.ts
git commit -m "feat(sheets): fetch multiple tabs with one batch request"
```

---

### Task 3: Add Lib-Level Page Data Builder

**Files:**

- Create: `src/lib/league.ts`
- Create: `src/tests/league.test.ts`

- [ ] **Step 1: Add failing page-data builder tests**

Create `src/tests/league.test.ts`.

```typescript
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
```

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm test -- src/tests/league.test.ts --reporter verbose
```

Expected: FAIL because `src/lib/league.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/league.ts`**

Create `src/lib/league.ts`.

```typescript
import { expectedScore, processMatches } from "./elo.js";
import { canonicalize, normalize } from "./names.js";
import {
  parseCanonicalTeams,
  parseMatchTab,
  parseMatchupsWithCourts,
  parseOfficialRankings,
  type RowsByTab,
} from "./sheets.js";
import type {
  LeaderboardEntry,
  Match,
  PageData,
  Ratings,
  Records,
  UpcomingGame,
} from "./types.js";

interface UpcomingMatchup {
  teamA: string;
  teamB: string;
  court: string | null;
  probA: number;
}

export interface LeaguePageConfig {
  weekTabs: string[];
  upcomingTab: string | null;
  summaryTab: string;
  rankingsNameCol: number;
  rankingsRankCol: number;
  seasonLabel: string;
  sheetUrl: string;
  myTeam: string;
  now?: Date;
}

function parseMatchesByWeek(
  rowsByTab: RowsByTab,
  weekTabs: string[],
  canonicalNames: string[],
): {
  allMatches: Match[];
  weekRowsCache: { weekIndex: number; rows: string[][] }[];
} {
  const allMatches: Match[] = [];
  const weekRowsCache: { weekIndex: number; rows: string[][] }[] = [];

  for (let i = 0; i < weekTabs.length; i++) {
    const rows = rowsByTab[weekTabs[i]] ?? [];
    weekRowsCache.push({ weekIndex: i, rows });
    allMatches.push(
      ...parseMatchTab(rows).map((match) => ({
        ...match,
        teamA: canonicalize(match.teamA, canonicalNames),
        teamB: canonicalize(match.teamB, canonicalNames),
        weekIndex: i,
      })),
    );
  }

  return { allMatches, weekRowsCache };
}

function toUpcomingMatchups(
  rows: string[][],
  ratings: Ratings,
  canonicalNames: string[],
): UpcomingMatchup[] {
  return parseMatchupsWithCourts(rows).map((matchup) => {
    const teamA = canonicalize(matchup.teamA, canonicalNames);
    const teamB = canonicalize(matchup.teamB, canonicalNames);
    const ratingA = ratings[teamA] ?? 1000;
    const ratingB = ratings[teamB] ?? 1000;

    return {
      teamA,
      teamB,
      court: matchup.court,
      probA: Math.round(expectedScore(ratingA, ratingB) * 100),
    };
  });
}

function resolveUpcomingMatchups(
  rowsByTab: RowsByTab,
  config: LeaguePageConfig,
  weekRowsCache: { weekIndex: number; rows: string[][] }[],
  ratings: Ratings,
  canonicalNames: string[],
): UpcomingMatchup[] {
  if (config.upcomingTab) {
    return toUpcomingMatchups(
      rowsByTab[config.upcomingTab] ?? [],
      ratings,
      canonicalNames,
    );
  }

  for (let i = weekRowsCache.length - 1; i >= 0; i--) {
    const matchups = toUpcomingMatchups(
      weekRowsCache[i].rows,
      ratings,
      canonicalNames,
    );
    if (matchups.length > 0) {
      return matchups;
    }
  }

  return [];
}

function buildUpcomingIndex(
  upcomingMatches: UpcomingMatchup[],
): Record<string, UpcomingGame[]> {
  const upcomingByTeam: Record<string, UpcomingGame[]> = {};

  for (const matchup of upcomingMatches) {
    const teamAKey = normalize(matchup.teamA);
    const teamBKey = normalize(matchup.teamB);
    upcomingByTeam[teamAKey] ??= [];
    upcomingByTeam[teamBKey] ??= [];
    upcomingByTeam[teamAKey].push({
      opponent: matchup.teamB,
      prob: matchup.probA,
      court: matchup.court,
    });
    upcomingByTeam[teamBKey].push({
      opponent: matchup.teamA,
      prob: 100 - matchup.probA,
      court: matchup.court,
    });
  }

  return upcomingByTeam;
}

function buildLeaderboard(
  ratings: Ratings,
  records: Records,
  officialRankings: Record<string, number>,
  upcomingByTeam: Record<string, UpcomingGame[]>,
  myTeam: string,
): LeaderboardEntry[] {
  return Object.keys(ratings)
    .sort((a, b) => ratings[b] - ratings[a])
    .map((name, index) => {
      const record = records[name] ?? {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      const eloRank = index + 1;
      const officialRank = officialRankings[name] ?? null;

      return {
        rank: eloRank,
        officialRank,
        rankDiff: officialRank !== null ? officialRank - eloRank : null,
        name,
        elo: ratings[name],
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
        upcoming: upcomingByTeam[normalize(name)] ?? [],
        isMyTeam: name === myTeam,
      };
    })
    .sort((a, b) => {
      if (a.officialRank === null && b.officialRank === null) {
        return 0;
      }
      if (a.officialRank === null) {
        return 1;
      }
      if (b.officialRank === null) {
        return -1;
      }
      return a.officialRank - b.officialRank;
    });
}

export function buildLeaguePageData(
  rowsByTab: RowsByTab,
  config: LeaguePageConfig,
): PageData {
  const summaryRows = rowsByTab[config.summaryTab] ?? [];
  const canonicalNames = parseCanonicalTeams(
    summaryRows,
    config.rankingsNameCol,
  );
  const officialRankings = parseOfficialRankings(
    summaryRows,
    config.rankingsNameCol,
    config.rankingsRankCol,
  );
  const { allMatches, weekRowsCache } = parseMatchesByWeek(
    rowsByTab,
    config.weekTabs,
    canonicalNames,
  );
  const { ratings, records } = processMatches(allMatches);
  const upcomingMatches = resolveUpcomingMatchups(
    rowsByTab,
    config,
    weekRowsCache,
    ratings,
    canonicalNames,
  );

  return {
    leaderboard: buildLeaderboard(
      ratings,
      records,
      officialRankings,
      buildUpcomingIndex(upcomingMatches),
      config.myTeam,
    ),
    seasonLabel: config.seasonLabel,
    lastUpdated: (config.now ?? new Date()).toISOString(),
    sheetUrl: config.sheetUrl,
    myTeam: config.myTeam,
  };
}
```

- [ ] **Step 4: Run focused tests and verify pass**

```bash
npm test -- src/tests/league.test.ts --reporter verbose
```

Expected: PASS for all `league.test.ts` tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/league.ts src/tests/league.test.ts
git commit -m "feat(league): build page data from fetched sheet rows"
```

---

### Task 4: Thin the Route to One Fetch and One Transform

**Files:**

- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Replace route implementation**

Replace `src/routes/+page.server.ts` with this file.

```typescript
import { PUBLIC_GOOGLE_API_KEY, PUBLIC_SHEET_ID } from "$env/static/public";
import { buildLeaguePageData } from "$lib/league.js";
import { fetchTabs } from "$lib/sheets.js";
import {
  WEEK_TABS,
  UPCOMING_TAB,
  SUMMARY_TAB,
  RANKINGS_NAME_COL,
  RANKINGS_RANK_COL,
  SEASON_LABEL,
  SHEET_URL,
  MY_TEAM,
} from "$lib/config.js";
import type { PageData } from "$lib/types.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: PageData | null = null;
let cachedAt = 0;

function requiredTabs(): string[] {
  return [
    ...new Set(
      [SUMMARY_TAB, ...WEEK_TABS, UPCOMING_TAB].filter(
        (tabName): tabName is string => Boolean(tabName),
      ),
    ),
  ];
}

export async function load(): Promise<PageData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const rowsByTab = await fetchTabs(
    PUBLIC_SHEET_ID,
    PUBLIC_GOOGLE_API_KEY,
    requiredTabs(),
  );

  cached = buildLeaguePageData(rowsByTab, {
    weekTabs: WEEK_TABS,
    upcomingTab: UPCOMING_TAB,
    summaryTab: SUMMARY_TAB,
    rankingsNameCol: RANKINGS_NAME_COL,
    rankingsRankCol: RANKINGS_RANK_COL,
    seasonLabel: SEASON_LABEL,
    sheetUrl: SHEET_URL,
    myTeam: MY_TEAM,
  });
  cachedAt = Date.now();

  return cached;
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --reporter verbose
```

Expected: PASS for all tests.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: PASS with no Prettier or ESLint errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "refactor(route): delegate sheet parsing to league builder"
```

---

### Task 5: Verify Batch Fetch Behavior in the Route

**Files:**

- Modify: `src/tests/league.test.ts`
- Modify: `src/tests/sheets.test.ts`

- [ ] **Step 1: Add a regression assertion for deduped batch ranges**

In the existing `fetchTabs` test in `src/tests/sheets.test.ts`, keep the duplicate `"Week 1"` input and keep this assertion:

```typescript
expect(url.searchParams.getAll("ranges")).toEqual(["Standings", "Week 1"]);
```

This assertion proves the low-level fetcher will not request the same tab twice.

- [ ] **Step 2: Add a regression test that parser chain does no network calls**

Append this test to `src/tests/league.test.ts`.

```typescript
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
```

Also update the `src/tests/league.test.ts` import to include `vi`.

```typescript
import { describe, expect, it, vi } from "vitest";
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --reporter verbose
```

Expected: PASS for all tests.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: PASS and SvelteKit build completes.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: PASS with no Prettier or ESLint errors.

- [ ] **Step 6: Commit**

```bash
git add src/tests/league.test.ts src/tests/sheets.test.ts
git commit -m "test: cover single-fetch sheet data pipeline"
```

---

## Self-Review

- Spec coverage: The route fetches all tabs once via `fetchTabs`; the parser chain lives in lib files; `buildLeaguePageData` returns the single typed `PageData` object needed by the page.
- Placeholder scan: No `TBD`, deferred behavior, or unspecified error handling remains.
- Type consistency: `RowsByTab`, `LeaguePageConfig`, `buildLeaguePageData`, `parseCanonicalTeams`, and `parseOfficialRankings` are defined before they are used by later tasks.
- Risk note: Existing `getCanonicalTeams` and `getOfficialRankings` remain for backwards compatibility but are no longer used by the route. They still perform single-tab fetches when called directly.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-sheets-batch-fetch-parser-chain.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.
