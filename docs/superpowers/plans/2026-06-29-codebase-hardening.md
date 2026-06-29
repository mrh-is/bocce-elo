# Bocce Elo Codebase Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the current failing test and harden the Sheets ingestion, page data contract, caching behavior, theme handling, and modal accessibility.

**Architecture:** Keep the existing SvelteKit single-route architecture. Strengthen the server-to-client data contract by serializing timestamps explicitly, make spreadsheet parsing stricter before data reaches Elo computation, add single-flight timeout-protected Sheets fetches at the route boundary, and improve small client components in place.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest, Cloudflare adapter, Google Sheets API v4.

---

## File Structure

- Modify `src/lib/types.ts`
  - Convert `Match` into a discriminated union so scored and forfeit matches are represented accurately.
  - Change `PageData.lastUpdated` from `Date` to ISO `string`.
- Modify `src/lib/league.ts`
  - Return `lastUpdated` as an ISO string.
  - Keep `LeaguePageConfig.now` as `Date` for deterministic tests.
- Modify `src/lib/elo.ts`
  - Remove non-null score assertions by narrowing on the discriminated `Match` union.
- Modify `src/lib/sheets.ts`
  - Add strict non-negative integer score parsing.
  - Preserve current parser behavior for blank scores and forfeits.
- Modify `src/routes/+page.server.ts`
  - Use private env imports for Sheets credentials.
  - Add an in-flight request cache to prevent concurrent duplicate fetches.
  - Keep stale cached data when refresh fails.
- Modify `.env.example`
  - Rename `PUBLIC_GOOGLE_API_KEY` and `PUBLIC_SHEET_ID` to server-only names.
- Modify `src/lib/components/PageHeader.svelte`
  - Type `lastUpdated` as `string`.
- Modify `src/lib/components/InfoModal.svelte`
  - Type `lastUpdated` as `string`.
  - Add focus management and basic Tab trapping while open.
- Modify `src/lib/components/RelativeTime.svelte`
  - Accept ISO string timestamps and parse them inside the component.
- Modify `src/lib/components/Footer.svelte`
  - Keep compatible with string `lastUpdated` if the component is still used.
- Modify `src/lib/components/ThemeSwitcher.svelte`
  - Validate `localStorage.theme` before using it.
- Modify `src/tests/league.test.ts`
  - Keep or update the current ISO timestamp expectation.
- Modify `src/tests/sheets.test.ts`
  - Add strict score parsing and upcoming matchups tests.
- Modify `src/tests/elo.test.ts`
  - Update match literals to satisfy the discriminated union.
- Create `src/tests/page-server.test.ts`
  - Test single-flight caching and stale-on-failure behavior for `load()`.

---

### Task 1: Make `lastUpdated` an Explicit ISO String Contract

**Files:**

- Modify: `src/lib/types.ts`
- Modify: `src/lib/league.ts`
- Modify: `src/lib/components/PageHeader.svelte`
- Modify: `src/lib/components/InfoModal.svelte`
- Modify: `src/lib/components/RelativeTime.svelte`
- Modify: `src/lib/components/Footer.svelte`
- Test: `src/tests/league.test.ts`

- [ ] **Step 1: Confirm the current failing test**

Run:

```bash
npm run test -- src/tests/league.test.ts
```

Expected: FAIL at `src/tests/league.test.ts:35` because `lastUpdated` is a `Date` object instead of `"2026-06-29T12:00:00.000Z"`.

- [ ] **Step 2: Update `PageData.lastUpdated` to a string**

In `src/lib/types.ts`, change only the `PageData` interface:

```ts
export interface PageData {
  leaderboard: LeaderboardEntry[];
  seasonLabel: string;
  lastUpdated: string;
  sheetUrl: string;
  myTeam: string;
}
```

- [ ] **Step 3: Serialize the timestamp in `buildLeaguePageData()`**

In `src/lib/league.ts`, replace the `lastUpdated` assignment in the return object with:

```ts
lastUpdated: (config.now ?? new Date()).toISOString(),
```

- [ ] **Step 4: Update `PageHeader.svelte` prop type**

In `src/lib/components/PageHeader.svelte`, change the `$props()` type to:

```ts
const {
  seasonLabel,
  lastUpdated,
  sheetUrl,
}: { seasonLabel: string; lastUpdated: string; sheetUrl: string } = $props();
```

- [ ] **Step 5: Update `InfoModal.svelte` prop type**

In `src/lib/components/InfoModal.svelte`, change the `$props()` type to:

```ts
let {
  open = $bindable(false),
  lastUpdated,
  sheetUrl,
}: { open: boolean; lastUpdated: string; sheetUrl: string } = $props();
```

- [ ] **Step 6: Update `RelativeTime.svelte` to parse ISO strings**

Replace `src/lib/components/RelativeTime.svelte` with:

```svelte
<script lang="ts">
  const { date }: { date: string } = $props();

  const parsedDate = $derived(new Date(date));
  const exactTimestamp = $derived(parsedDate.toLocaleString());

  function relativeTime(from: Date, now: number): string {
    const diff = Math.floor((now - from.getTime()) / 1000);
    if (!Number.isFinite(diff)) {
      return "unknown";
    }
    if (diff < 0) {
      return "just now";
    }
    if (diff < 60) {
      return `${diff} second${diff === 1 ? "" : "s"} ago`;
    }
    const mins = Math.floor(diff / 60);
    if (mins < 60) {
      return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) {
      return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    }
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  let now = $state(Date.now());
  const text = $derived(relativeTime(parsedDate, now));

  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now();
    }, 10_000);
    return () => clearInterval(interval);
  });
</script>

<span class="relative-time" title={exactTimestamp}>{text}</span>

<style>
  .relative-time {
    border-bottom: 1px dashed var(--text-dim);
    cursor: help;
  }
</style>
```

- [ ] **Step 7: Check `Footer.svelte` accepts the new type**

If `src/lib/components/Footer.svelte` declares `lastUpdated` as `Date`, change that prop to `string`. Keep display code as:

```svelte
Updated {new Date(lastUpdated).toLocaleString()} ·
```

- [ ] **Step 8: Run the focused test**

Run:

```bash
npm run test -- src/tests/league.test.ts
```

Expected: PASS for all `league.test.ts` tests.

- [ ] **Step 9: Commit**

```bash
git add src/lib/types.ts src/lib/league.ts src/lib/components/PageHeader.svelte src/lib/components/InfoModal.svelte src/lib/components/RelativeTime.svelte src/lib/components/Footer.svelte src/tests/league.test.ts
git commit -m "fix: serialize page timestamps"
```

---

### Task 2: Strictly Parse Scores from Google Sheets

**Files:**

- Modify: `src/lib/sheets.ts`
- Test: `src/tests/sheets.test.ts`

- [ ] **Step 1: Add failing tests for malformed scores and upcoming matchups**

In `src/tests/sheets.test.ts`, update the import list to include `parseMatchupsWithCourts`:

```ts
import {
  parseMatch,
  parseMatchTab,
  parseCanonicalTeams,
  parseOfficialRankings,
  parseMatchupsWithCourts,
  fetchTabs,
} from "../lib/sheets.js";
```

Add these tests inside `describe("parseMatch", ...)`:

```ts
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
```

Add this new block after `describe("parseOfficialRankings", ...)`:

```ts
describe("parseMatchupsWithCourts", () => {
  it("extracts upcoming matchups from both game blocks with court numbers", () => {
    const rows = [
      ["", "1", "Alpha", "", "Beta", "", "", "Gamma", "", "Delta", ""],
      ["", "2", "Epsilon", "", "Zeta", "", "", "", "", "", ""],
    ];

    expect(parseMatchupsWithCourts(rows)).toEqual([
      { teamA: "Alpha", teamB: "Beta", court: "1" },
      { teamA: "Epsilon", teamB: "Zeta", court: "2" },
      { teamA: "Gamma", teamB: "Delta", court: "1" },
    ]);
  });

  it("skips incomplete upcoming matchups", () => {
    const rows = [["", "1", "Alpha", "", "", "", "", "Gamma", "", "", ""]];

    expect(parseMatchupsWithCourts(rows)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify the new score tests fail**

Run:

```bash
npm run test -- src/tests/sheets.test.ts
```

Expected: FAIL for malformed numeric strings currently accepted by `parseInt`.

- [ ] **Step 3: Add strict score parsing**

In `src/lib/sheets.ts`, add this helper above `parseMatch()`:

```ts
function parseScore(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  return Number(raw);
}
```

Then replace the `parseInt` block in `parseMatch()` with:

```ts
const scoreA = parseScore(rawA);
const scoreB = parseScore(rawB);
if (scoreA === null || scoreB === null) {
  return null;
}
return { kind: "scored", teamA, teamB, scoreA, scoreB };
```

If Task 3 has not yet been implemented, temporarily return the existing object shape instead:

```ts
return { teamA, teamB, scoreA, scoreB, forfeitA: false, forfeitB: false };
```

Task 3 will convert this to the final discriminated union shape.

- [ ] **Step 4: Run focused parser tests**

Run:

```bash
npm run test -- src/tests/sheets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts src/tests/sheets.test.ts
git commit -m "fix: strictly parse sheet scores"
```

---

### Task 3: Replace `Match` with a Discriminated Union

**Files:**

- Modify: `src/lib/types.ts`
- Modify: `src/lib/sheets.ts`
- Modify: `src/lib/league.ts`
- Modify: `src/lib/elo.ts`
- Test: `src/tests/sheets.test.ts`
- Test: `src/tests/elo.test.ts`

- [ ] **Step 1: Update the `Match` type**

In `src/lib/types.ts`, replace the current `Match` interface with:

```ts
interface MatchBase {
  teamA: string;
  teamB: string;
  weekIndex?: number;
}

export interface ScoredMatch extends MatchBase {
  kind: "scored";
  scoreA: number;
  scoreB: number;
}

export interface ForfeitMatch extends MatchBase {
  kind: "forfeit";
  forfeitingTeam: "A" | "B";
}

export type Match = ScoredMatch | ForfeitMatch;
```

- [ ] **Step 2: Update parser test expectations**

In `src/tests/sheets.test.ts`, change normal score expectations to:

```ts
expect(parseMatch(row, 0)).toEqual({
  kind: "scored",
  teamA: "Team Alpha",
  teamB: "Team Beta",
  scoreA: 21,
  scoreB: 14,
});
```

Change the right-block expectation to:

```ts
expect(parseMatch(row, 5)).toEqual({
  kind: "scored",
  teamA: "Team Gamma",
  teamB: "Team Delta",
  scoreA: 18,
  scoreB: 21,
});
```

Change forfeit expectations to:

```ts
expect(parseMatch(row, 0)).toEqual({
  kind: "forfeit",
  teamA: "Team Alpha",
  teamB: "Team Beta",
  forfeitingTeam: "A",
});
```

and:

```ts
expect(parseMatch(row, 0)).toEqual({
  kind: "forfeit",
  teamA: "Team Alpha",
  teamB: "Team Beta",
  forfeitingTeam: "B",
});
```

In `parseMatchTab` tests, replace checks like `matches[3].forfeitA` with:

```ts
expect(matches[3]).toMatchObject({
  kind: "forfeit",
  forfeitingTeam: "A",
  teamA: "Eta",
});
```

- [ ] **Step 3: Update Elo test match literals**

In `src/tests/elo.test.ts`, convert every completed match literal to:

```ts
{
  kind: "scored",
  teamA: "Alpha",
  teamB: "Beta",
  scoreA: 21,
  scoreB: 14,
}
```

Convert forfeit match literals to:

```ts
{
  kind: "forfeit",
  teamA: "Alpha",
  teamB: "Beta",
  forfeitingTeam: "A",
}
```

Keep `weekIndex` on scored match literals that need it:

```ts
{
  kind: "scored",
  teamA: "Alpha",
  teamB: "Beta",
  scoreA: 21,
  scoreB: 14,
  weekIndex: 0,
}
```

- [ ] **Step 4: Run tests to verify type and runtime failures**

Run:

```bash
npm run test -- src/tests/sheets.test.ts src/tests/elo.test.ts
```

Expected: FAIL until implementation is updated.

- [ ] **Step 5: Update `parseMatch()` implementation**

In `src/lib/sheets.ts`, replace the final scored and forfeit returns with:

```ts
return { kind: "scored", teamA, teamB, scoreA, scoreB };
```

and:

```ts
if (forfeitA && forfeitB) {
  return null;
}

return {
  kind: "forfeit",
  teamA,
  teamB,
  forfeitingTeam: forfeitA ? "A" : "B",
};
```

The complete `parseMatch()` should read:

```ts
export function parseMatch(row: string[], colOffset: number): Match | null {
  const teamA = row[colOffset + MATCH_COLS.TEAM_A]?.trim();
  const teamB = row[colOffset + MATCH_COLS.TEAM_B]?.trim();
  if (!teamA || !teamB) {
    return null;
  }

  const rawA = row[colOffset + MATCH_COLS.SCORE_A]?.trim() ?? "";
  const rawB = row[colOffset + MATCH_COLS.SCORE_B]?.trim() ?? "";

  const forfeitA = rawA.toUpperCase() === "F";
  const forfeitB = rawB.toUpperCase() === "F";

  if (!forfeitA && !forfeitB) {
    if (!rawA && !rawB) {
      return null;
    }
    const scoreA = parseScore(rawA);
    const scoreB = parseScore(rawB);
    if (scoreA === null || scoreB === null) {
      return null;
    }
    return { kind: "scored", teamA, teamB, scoreA, scoreB };
  }

  if (forfeitA && forfeitB) {
    return null;
  }

  return {
    kind: "forfeit",
    teamA,
    teamB,
    forfeitingTeam: forfeitA ? "A" : "B",
  };
}
```

- [ ] **Step 6: Update `parseMatchesByWeek()` spread in `league.ts`**

The existing spread still works with the union. Keep this shape:

```ts
...match,
teamA: canonicalize(match.teamA, canonicalNames),
teamB: canonicalize(match.teamB, canonicalNames),
weekIndex: i,
```

Do not add score or forfeit fields in `league.ts`.

- [ ] **Step 7: Update `resolveMatchOutcome()` in `elo.ts`**

Replace `resolveMatchOutcome()` with:

```ts
function resolveMatchOutcome(
  match: Match,
  records: Records,
): { actualA: number; actualB: number; mult: number } {
  const { teamA, teamB } = match;

  if (match.kind === "forfeit") {
    if (match.forfeitingTeam === "A") {
      records[teamA].losses++;
      records[teamB].wins++;
      return { actualA: 0, actualB: 1, mult: 1.0 };
    }

    records[teamA].wins++;
    records[teamB].losses++;
    return { actualA: 1, actualB: 0, mult: 1.0 };
  }

  const { scoreA, scoreB } = match;

  if (scoreA === scoreB) {
    records[teamA].ties++;
    records[teamB].ties++;
    records[teamA].pointsFor += scoreA;
    records[teamA].pointsAgainst += scoreB;
    records[teamB].pointsFor += scoreB;
    records[teamB].pointsAgainst += scoreA;
    return { actualA: 0.5, actualB: 0.5, mult: 1.0 };
  }

  if (scoreA > scoreB) {
    records[teamA].wins++;
    records[teamB].losses++;
  } else {
    records[teamA].losses++;
    records[teamB].wins++;
  }
  records[teamA].pointsFor += scoreA;
  records[teamA].pointsAgainst += scoreB;
  records[teamB].pointsFor += scoreB;
  records[teamB].pointsAgainst += scoreA;

  return {
    actualA: scoreA > scoreB ? 1 : 0,
    actualB: scoreB > scoreA ? 1 : 0,
    mult: marginMultiplier(Math.max(scoreA, scoreB), Math.min(scoreA, scoreB)),
  };
}
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm run test -- src/tests/sheets.test.ts src/tests/elo.test.ts src/tests/league.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/types.ts src/lib/sheets.ts src/lib/league.ts src/lib/elo.ts src/tests/sheets.test.ts src/tests/elo.test.ts
git commit -m "refactor: model match outcomes explicitly"
```

---

### Task 4: Add Timeout-Protected Sheets Fetching

**Files:**

- Modify: `src/lib/sheets.ts`
- Test: `src/tests/sheets.test.ts`

- [ ] **Step 1: Add a fetch timeout test**

In `src/tests/sheets.test.ts`, add this test inside `describe("fetchTabs", ...)`:

```ts
it("aborts the Sheets request when the timeout elapses", async () => {
  vi.useFakeTimers();
  vi.spyOn(globalThis, "fetch").mockImplementation(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
  );

  const promise = fetchTabs("sheet-id", "api-key", ["Standings"], {
    timeoutMs: 100,
  });

  await vi.advanceTimersByTimeAsync(100);

  await expect(promise).rejects.toThrow("Sheets API request timed out");
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -- src/tests/sheets.test.ts
```

Expected: FAIL because `fetchTabs()` does not accept options or abort requests.

- [ ] **Step 3: Add `FetchTabsOptions` and timeout logic**

In `src/lib/sheets.ts`, add:

```ts
interface FetchTabsOptions {
  timeoutMs?: number;
}
```

Change the function signature to:

```ts
export async function fetchTabs(
  sheetId: string,
  apiKey: string,
  tabNames: string[],
  options: FetchTabsOptions = {},
): Promise<RowsByTab> {
```

Replace:

```ts
const res = await fetch(url);
```

with:

```ts
const controller = new AbortController();
const timeoutMs = options.timeoutMs ?? 8_000;
const timeout = setTimeout(() => controller.abort(), timeoutMs);

let res: Response;
try {
  res = await fetch(url, { signal: controller.signal });
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") {
    throw new Error(
      `Sheets API request timed out after ${timeoutMs}ms for tabs ${uniqueTabNames
        .map((tab) => `"${tab}"`)
        .join(", ")}`,
    );
  }
  throw err;
} finally {
  clearTimeout(timeout);
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm run test -- src/tests/sheets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts src/tests/sheets.test.ts
git commit -m "fix: timeout sheets requests"
```

---

### Task 5: Add Single-Flight Caching for Server Loads

**Files:**

- Modify: `src/routes/+page.server.ts`
- Create: `src/tests/page-server.test.ts`

- [ ] **Step 1: Add server load tests**

Create `src/tests/page-server.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$env/static/private", () => ({
  GOOGLE_API_KEY: "api-key",
  SHEET_ID: "sheet-id",
}));

vi.mock("$lib/config.js", () => ({
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

vi.mock("$lib/sheets.js", async () => {
  const actual =
    await vi.importActual<typeof import("../lib/sheets.js")>(
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
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
npm run test -- src/tests/page-server.test.ts
```

Expected: FAIL because `+page.server.ts` imports public env vars, has no `__testing`, and does not dedupe in-flight loads.

- [ ] **Step 3: Update env imports in `+page.server.ts`**

Replace:

```ts
import { PUBLIC_GOOGLE_API_KEY, PUBLIC_SHEET_ID } from "$env/static/public";
```

with:

```ts
import { GOOGLE_API_KEY, SHEET_ID } from "$env/static/private";
```

- [ ] **Step 4: Add in-flight caching and test hook**

In `src/routes/+page.server.ts`, add after `cachedAt`:

```ts
let inFlight: Promise<PageData> | null = null;
```

Add this helper above `load()`:

```ts
async function refreshData(): Promise<PageData> {
  const rowsByTab = await fetchTabs(SHEET_ID, GOOGLE_API_KEY, requiredTabs());

  const data = buildLeaguePageData(rowsByTab, {
    weekTabs: WEEK_TABS,
    upcomingTab: UPCOMING_TAB,
    summaryTab: SUMMARY_TAB,
    rankingsNameCol: RANKINGS_NAME_COL,
    rankingsRankCol: RANKINGS_RANK_COL,
    seasonLabel: SEASON_LABEL,
    sheetUrl: SHEET_URL,
    myTeam: MY_TEAM,
  });

  cached = data;
  cachedAt = Date.now();
  return data;
}
```

Replace `load()` with:

```ts
export async function load(): Promise<PageData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  if (!inFlight) {
    inFlight = refreshData().finally(() => {
      inFlight = null;
    });
  }

  try {
    return await inFlight;
  } catch (err) {
    console.error("Failed to load league data:", err);
    if (!cached) {
      throw err;
    }
    return cached;
  }
}
```

Add this export at the bottom:

```ts
export const __testing = {
  expireCache() {
    cachedAt = 0;
  },
};
```

- [ ] **Step 5: Update `.env.example`**

Replace:

```dotenv
PUBLIC_GOOGLE_API_KEY=...
PUBLIC_SHEET_ID=1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs
```

with:

```dotenv
GOOGLE_API_KEY=...
SHEET_ID=1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs
```

- [ ] **Step 6: Update `CLAUDE.md` env var docs**

Replace the env vars section with:

```md
## Env vars
```

GOOGLE_API_KEY=...
SHEET_ID=1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs

```

Both are server-only because all Google Sheets fetching happens in `+page.server.ts`.
The Sheet must remain publicly readable by the configured API key.
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm run test -- src/tests/page-server.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/routes/+page.server.ts src/tests/page-server.test.ts .env.example CLAUDE.md
git commit -m "fix: dedupe server data refreshes"
```

---

### Task 6: Validate Stored Theme Values

**Files:**

- Modify: `src/lib/components/ThemeSwitcher.svelte`

- [ ] **Step 1: Add a theme validation helper**

In `src/lib/components/ThemeSwitcher.svelte`, add below the `Theme` type:

```ts
const THEMES: Theme[] = ["light", "dark", "system"];

function isTheme(value: string | null): value is Theme {
  return THEMES.includes(value as Theme);
}
```

- [ ] **Step 2: Use the helper for initial state**

Replace the `theme` initialization with:

```ts
const storedTheme =
  typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;

let theme = $state<Theme>(isTheme(storedTheme) ? storedTheme : "system");
```

- [ ] **Step 3: Run checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ThemeSwitcher.svelte
git commit -m "fix: validate stored theme"
```

---

### Task 7: Improve Modal Focus and Keyboard Behavior

**Files:**

- Modify: `src/lib/components/InfoModal.svelte`

- [ ] **Step 1: Add focus state and helpers**

In `src/lib/components/InfoModal.svelte`, add these variables and functions in the `<script>` block after `issuesUrl`:

```ts
let closeButton: HTMLButtonElement;
let previouslyFocused: HTMLElement | null = null;

function focusableElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      ".modal button, .modal a[href], .modal [tabindex]:not([tabindex='-1'])",
    ),
  ).filter((element) => !element.hasAttribute("disabled"));
}
```

- [ ] **Step 2: Add focus open/close effects**

Add this `$effect` after the helper functions:

```ts
$effect(() => {
  if (!open) {
    return;
  }

  previouslyFocused = document.activeElement as HTMLElement | null;
  closeButton?.focus();

  return () => {
    previouslyFocused?.focus();
    previouslyFocused = null;
  };
});
```

- [ ] **Step 3: Replace `onKeydown()` with Escape and Tab handling**

Replace `onKeydown()` with:

```ts
function onKeydown(e: KeyboardEvent) {
  if (!open) {
    return;
  }

  if (e.key === "Escape") {
    close();
    return;
  }

  if (e.key !== "Tab") {
    return;
  }

  const focusable = focusableElements();
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
```

- [ ] **Step 4: Bind the close button**

Change the close button to:

```svelte
<button
  bind:this={closeButton}
  class="close-btn"
  onclick={close}
  aria-label="Close"
>
  ✕
</button>
```

- [ ] **Step 5: Run checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/InfoModal.svelte
git commit -m "fix: manage modal focus"
```

---

### Task 8: Final Verification and Cleanup

**Files:**

- Review all modified files.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm run test
```

Expected: PASS for all test files.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff --stat
git diff -- src/lib/types.ts src/lib/sheets.ts src/lib/elo.ts src/lib/league.ts src/routes/+page.server.ts
```

Expected: Changes are limited to timestamp serialization, strict parsing, explicit match modeling, timeout/single-flight fetch behavior, env var names, and small component hardening.

- [ ] **Step 5: Commit any final test-only or cleanup changes**

If Task 8 produced cleanup edits, commit them:

```bash
git add .
git commit -m "test: verify hardened data pipeline"
```

If there are no remaining changes, do not create an empty commit.

---

## Self-Review

**Spec coverage:** This plan covers every finding and recommendation from the review: failing `lastUpdated` test, strict score parsing, invalid `Match` states, concurrent load stampede, Sheets timeout, server-only env vars, upcoming matchup parser tests, theme validation, and modal focus behavior.

**Placeholder scan:** No `TBD`, generic "handle edge cases", or unspecified test steps remain. Each task includes concrete files, code snippets, commands, and expected outcomes.

**Type consistency:** `PageData.lastUpdated` becomes `string` throughout page data and components. `Match` becomes `ScoredMatch | ForfeitMatch`, and parser, Elo, and tests all use the same discriminants: `kind: "scored"` and `kind: "forfeit"`.
