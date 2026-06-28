# Readability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor four files for junior-developer readability through extracted helpers, named constants, a layout diagram, and fine-grained Svelte components.

**Architecture:** Pure structural refactor — no behavior changes. TS helpers extracted into their originating files. Svelte page split into six components under `src/lib/components/`. Global CSS extracted to `src/app.css` via a new `+layout.svelte`.

**Tech Stack:** TypeScript (strict), SvelteKit 2, Svelte 5 (runes), Vitest 4

## Global Constraints

- No behavior changes — all 29 existing tests must pass before and after every task
- New Svelte components use `<script lang="ts">`
- `.js` extensions in all relative imports (TypeScript bundler resolution)
- Helpers stay in their originating file — no new lib modules
- `npm run lint` must pass after every task (ESLint + Prettier)

---

### Task 1: Refactor `elo.ts` — extract `trackWeekAppearance` and `resolveMatchOutcome`

**Files:**

- Modify: `src/lib/elo.ts`

**Interfaces:**

- Produces: same exported API (`expectedScore`, `marginMultiplier`, `processMatches`) — callers unchanged

- [ ] **Step 1: Confirm baseline tests pass**

```bash
npm test -- --reporter verbose
```

Expected: 29 passed, 0 failed.

- [ ] **Step 2: Replace `src/lib/elo.ts` with the refactored version**

```typescript
import type {
  Match,
  Ratings,
  Records,
  WeeklyRatings,
  ProcessMatchesResult,
} from "./types.js";

const STARTING_RATING = 1000;
const K = 40;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function marginMultiplier(
  winnerScore: number,
  loserScore: number,
): number {
  const margin = Math.abs(winnerScore - loserScore);
  return Math.min(Math.log(margin + 1) / Math.log(12), 2.0);
}

function initTeam(
  ratings: Ratings,
  records: Records,
  weeklyRatings: WeeklyRatings,
  name: string,
): void {
  if (!ratings[name]) {
    ratings[name] = STARTING_RATING;
    records[name] = {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
    weeklyRatings[name] = [];
  }
}

function trackWeekAppearance(
  weekAppearances: Record<number, Record<string, number>>,
  weekIndex: number,
  team: string,
): void {
  if (!weekAppearances[weekIndex]) {
    weekAppearances[weekIndex] = {};
  }
  weekAppearances[weekIndex][team] =
    (weekAppearances[weekIndex][team] ?? 0) + 1;
  if (weekAppearances[weekIndex][team] > 2) {
    // eslint-disable-next-line no-console
    console.warn(
      `[elo] ${team} appears more than 2 times in week ${weekIndex}`,
    );
  }
}

function resolveMatchOutcome(
  match: Match,
  records: Records,
): { actualA: number; actualB: number; mult: number } {
  const { teamA, teamB, scoreA, scoreB, forfeitA, forfeitB } = match;

  if (forfeitA) {
    records[teamA].losses++;
    records[teamB].wins++;
    return { actualA: 0, actualB: 1, mult: 1.0 };
  }

  if (forfeitB) {
    records[teamA].wins++;
    records[teamB].losses++;
    return { actualA: 1, actualB: 0, mult: 1.0 };
  }

  if (scoreA === scoreB) {
    records[teamA].ties++;
    records[teamB].ties++;
    records[teamA].pointsFor += scoreA!;
    records[teamA].pointsAgainst += scoreB!;
    records[teamB].pointsFor += scoreB!;
    records[teamB].pointsAgainst += scoreA!;
    return { actualA: 0.5, actualB: 0.5, mult: 1.0 };
  }

  if (scoreA! > scoreB!) {
    records[teamA].wins++;
    records[teamB].losses++;
  } else {
    records[teamA].losses++;
    records[teamB].wins++;
  }
  records[teamA].pointsFor += scoreA!;
  records[teamA].pointsAgainst += scoreB!;
  records[teamB].pointsFor += scoreB!;
  records[teamB].pointsAgainst += scoreA!;

  return {
    actualA: scoreA! > scoreB! ? 1 : 0,
    actualB: scoreB! > scoreA! ? 1 : 0,
    mult: marginMultiplier(
      Math.max(scoreA!, scoreB!),
      Math.min(scoreA!, scoreB!),
    ),
  };
}

export function processMatches(matches: Match[]): ProcessMatchesResult {
  const ratings: Ratings = {};
  const records: Records = {};
  const weeklyRatings: WeeklyRatings = {};
  const weekAppearances: Record<number, Record<string, number>> = {};

  for (const match of matches) {
    const { teamA, teamB, weekIndex } = match;

    initTeam(ratings, records, weeklyRatings, teamA);
    initTeam(ratings, records, weeklyRatings, teamB);

    if (weekIndex !== undefined) {
      trackWeekAppearance(weekAppearances, weekIndex, teamA);
      trackWeekAppearance(weekAppearances, weekIndex, teamB);
    }

    const rA = ratings[teamA];
    const rB = ratings[teamB];
    const eA = expectedScore(rA, rB);
    const eB = 1 - eA;

    const { actualA, actualB, mult } = resolveMatchOutcome(match, records);

    ratings[teamA] = Math.round(rA + K * mult * (actualA - eA));
    ratings[teamB] = Math.round(rB + K * mult * (actualB - eB));

    weeklyRatings[teamA].push(ratings[teamA]);
    weeklyRatings[teamB].push(ratings[teamB]);
  }

  return { ratings, records, weeklyRatings };
}
```

- [ ] **Step 3: Confirm tests still pass**

```bash
npm test -- --reporter verbose
```

Expected: 29 passed, 0 failed.

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/elo.ts
git commit -m "refactor(elo): extract trackWeekAppearance and resolveMatchOutcome helpers"
```

---

### Task 2: Refactor `sheets.ts` — layout diagram + named column constants

**Files:**

- Modify: `src/lib/sheets.ts`

**Interfaces:**

- Produces: same exported API — callers unchanged

- [ ] **Step 1: Replace `src/lib/sheets.ts` with the refactored version**

```typescript
import type {
  Match,
  MatchupWithCourt,
  ScheduledMatch,
  OfficialRankings,
} from "./types.js";

// Spreadsheet row layout (0-indexed columns):
// | 0:blank | 1:court | 2:teamA | 3:scoreA | 4:teamB | 5:scoreB | 6:blank | 7:teamA2 | 8:scoreA2 | 9:teamB2 | 10:scoreB2 |
//
// Left match block  = cols 1–5  → parseMatch(row, colOffset=1)
// Right match block = cols 6–10 → parseMatch(row, colOffset=6)

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const MATCH_COLS = {
  COURT: 0,
  TEAM_A: 1,
  SCORE_A: 2,
  TEAM_B: 3,
  SCORE_B: 4,
} as const;

const MATCHUP_COLS = {
  COURT: 1,
  LEFT_A: 2,
  LEFT_B: 4,
  RIGHT_A: 7,
  RIGHT_B: 9,
} as const;

export async function fetchTab(
  sheetId: string,
  apiKey: string,
  tabName: string,
): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(tabName)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Sheets API error for tab "${tabName}": ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

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
    const scoreA = parseInt(rawA, 10);
    const scoreB = parseInt(rawB, 10);
    if (isNaN(scoreA) || isNaN(scoreB)) {
      return null;
    }
    return { teamA, teamB, scoreA, scoreB, forfeitA: false, forfeitB: false };
  }

  return { teamA, teamB, scoreA: null, scoreB: null, forfeitA, forfeitB };
}

export function parseMatchTab(rows: string[][]): Match[] {
  const matches: Match[] = [];
  for (const row of rows) {
    if (!row || row.length < 2) {
      continue;
    }
    // Actual sheet layout: [blank, court#, teamA, scoreA, teamB, scoreB, blank, teamA2, scoreA2, teamB2, scoreB2]
    const left = parseMatch(row, 1);
    if (left) {
      matches.push(left);
    }
    const right = parseMatch(row, 6);
    if (right) {
      matches.push(right);
    }
  }
  return matches;
}

export async function getCanonicalTeams(
  sheetId: string,
  apiKey: string,
  summaryTab: string,
  nameCol: number,
): Promise<string[]> {
  const rows = await fetchTab(sheetId, apiKey, summaryTab);
  const names = new Set<string>();
  for (const row of rows.slice(1)) {
    const name = row[nameCol]?.trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names];
}

export async function getOfficialRankings(
  sheetId: string,
  apiKey: string,
  summaryTab: string,
  nameCol: number,
  rankCol: number,
): Promise<OfficialRankings> {
  const rows = await fetchTab(sheetId, apiKey, summaryTab);
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

export function parseScheduledMatch(
  row: string[],
  colOffset: number,
): ScheduledMatch | null {
  const teamA = row[colOffset + MATCH_COLS.TEAM_A]?.trim();
  const teamB = row[colOffset + MATCH_COLS.TEAM_B]?.trim();
  if (!teamA || !teamB) {
    return null;
  }
  const rawA = row[colOffset + MATCH_COLS.SCORE_A]?.trim() ?? "";
  const rawB = row[colOffset + MATCH_COLS.SCORE_B]?.trim() ?? "";
  if (!rawA && !rawB) {
    return { teamA, teamB };
  }
  return null;
}

export function parseMatchupsWithCourts(rows: string[][]): MatchupWithCourt[] {
  const game1: MatchupWithCourt[] = [];
  const game2: MatchupWithCourt[] = [];
  for (const row of rows) {
    if (!row || row.length < 5) {
      continue;
    }
    const court = row[MATCHUP_COLS.COURT]?.trim() || null;
    const leftA = row[MATCHUP_COLS.LEFT_A]?.trim();
    const leftB = row[MATCHUP_COLS.LEFT_B]?.trim();
    if (leftA && leftB) {
      game1.push({ teamA: leftA, teamB: leftB, court });
    }
    const rightA = row[MATCHUP_COLS.RIGHT_A]?.trim();
    const rightB = row[MATCHUP_COLS.RIGHT_B]?.trim();
    if (rightA && rightB) {
      game2.push({ teamA: rightA, teamB: rightB, court });
    }
  }
  return [...game1, ...game2];
}

export function parseScheduledMatchTab(rows: string[][]): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  for (const row of rows) {
    if (!row || row.length < 2) {
      continue;
    }
    const left = parseScheduledMatch(row, 1);
    if (left) {
      matches.push(left);
    }
    const right = parseScheduledMatch(row, 6);
    if (right) {
      matches.push(right);
    }
  }
  return matches;
}
```

- [ ] **Step 2: Confirm tests still pass**

```bash
npm test -- --reporter verbose
```

Expected: 29 passed, 0 failed.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sheets.ts
git commit -m "refactor(sheets): add column layout diagram and named column constants"
```

---

### Task 3: Refactor `+page.server.ts` — extract five helper functions

**Files:**

- Modify: `src/routes/+page.server.ts`

**Interfaces:**

- Consumes: `Ratings`, `Records` from `$lib/types.js` (add to import)
- Produces: same exported `load()` function — SvelteKit callers unchanged

- [ ] **Step 1: Replace `src/routes/+page.server.ts` with the refactored version**

```typescript
import { PUBLIC_GOOGLE_API_KEY, PUBLIC_SHEET_ID } from "$env/static/public";
import {
  fetchTab,
  parseMatchTab,
  parseMatchupsWithCourts,
  getCanonicalTeams,
  getOfficialRankings,
} from "$lib/sheets.js";
import { canonicalize, normalize } from "$lib/names.js";
import { processMatches, expectedScore } from "$lib/elo.js";
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
import type {
  Match,
  Ratings,
  Records,
  LeaderboardEntry,
  UpcomingGame,
  PageData,
} from "$lib/types.js";

type UpcomingMatchup = {
  teamA: string;
  teamB: string;
  court: string | null;
  probA: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: PageData | null = null;
let cachedAt = 0;

async function fetchLeagueData(
  sheetId: string,
  apiKey: string,
): Promise<{
  canonicalNames: string[];
  officialRankings: Record<string, number>;
}> {
  let canonicalNames: string[] = [];
  try {
    canonicalNames = await getCanonicalTeams(
      sheetId,
      apiKey,
      SUMMARY_TAB,
      RANKINGS_NAME_COL,
    );
  } catch (err) {
    console.warn(
      `[load] Could not fetch canonical teams: ${(err as Error).message}`,
    );
  }

  let officialRankings: Record<string, number> = {};
  try {
    officialRankings = await getOfficialRankings(
      sheetId,
      apiKey,
      SUMMARY_TAB,
      RANKINGS_NAME_COL,
      RANKINGS_RANK_COL,
    );
  } catch (err) {
    console.warn(
      `[load] Could not fetch official rankings: ${(err as Error).message}`,
    );
  }

  return { canonicalNames, officialRankings };
}

async function fetchAllMatches(
  sheetId: string,
  apiKey: string,
  weekTabs: string[],
  canonicalNames: string[],
): Promise<{
  allMatches: Match[];
  weekRowsCache: { weekIndex: number; rows: string[][] }[];
}> {
  const allMatches: Match[] = [];
  const weekRowsCache: { weekIndex: number; rows: string[][] }[] = [];

  for (let i = 0; i < weekTabs.length; i++) {
    let rows: string[][];
    try {
      rows = await fetchTab(sheetId, apiKey, weekTabs[i]);
    } catch (err) {
      console.warn(
        `[load] Skipping tab "${weekTabs[i]}": ${(err as Error).message}`,
      );
      continue;
    }
    weekRowsCache.push({ weekIndex: i, rows });
    const matches: Match[] = parseMatchTab(rows).map((m) => ({
      ...m,
      teamA: canonicalize(m.teamA, canonicalNames),
      teamB: canonicalize(m.teamB, canonicalNames),
      weekIndex: i,
    }));
    allMatches.push(...matches);
  }

  return { allMatches, weekRowsCache };
}

async function resolveUpcoming(
  weekRowsCache: { weekIndex: number; rows: string[][] }[],
  sheetId: string,
  apiKey: string,
  ratings: Ratings,
  canonicalNames: string[],
): Promise<UpcomingMatchup[]> {
  const toMatchups = (rows: string[][]): UpcomingMatchup[] =>
    parseMatchupsWithCourts(rows).map((m) => {
      const tA = canonicalize(m.teamA, canonicalNames);
      const tB = canonicalize(m.teamB, canonicalNames);
      const rA = ratings[tA] ?? 1000;
      const rB = ratings[tB] ?? 1000;
      return {
        teamA: tA,
        teamB: tB,
        court: m.court,
        probA: Math.round(expectedScore(rA, rB) * 100),
      };
    });

  if (UPCOMING_TAB) {
    try {
      const rows = await fetchTab(sheetId, apiKey, UPCOMING_TAB);
      return toMatchups(rows);
    } catch (err) {
      console.warn(
        `[load] Could not fetch upcoming tab "${UPCOMING_TAB}": ${(err as Error).message}`,
      );
      return [];
    }
  }

  for (let i = weekRowsCache.length - 1; i >= 0; i--) {
    const matchups = toMatchups(weekRowsCache[i].rows);
    if (matchups.length > 0) return matchups;
  }
  return [];
}

function buildUpcomingIndex(
  upcomingMatches: UpcomingMatchup[],
): Record<string, UpcomingGame[]> {
  const upcomingByTeam: Record<string, UpcomingGame[]> = {};
  for (const m of upcomingMatches) {
    const kA = normalize(m.teamA);
    const kB = normalize(m.teamB);
    if (!upcomingByTeam[kA]) upcomingByTeam[kA] = [];
    if (!upcomingByTeam[kB]) upcomingByTeam[kB] = [];
    upcomingByTeam[kA].push({
      opponent: m.teamB,
      prob: m.probA,
      court: m.court,
    });
    upcomingByTeam[kB].push({
      opponent: m.teamA,
      prob: 100 - m.probA,
      court: m.court,
    });
  }
  return upcomingByTeam;
}

function buildLeaderboard(
  ratings: Ratings,
  records: Records,
  officialRankings: Record<string, number>,
  upcomingByTeam: Record<string, UpcomingGame[]>,
): LeaderboardEntry[] {
  return Object.keys(ratings)
    .sort((a, b) => ratings[b] - ratings[a])
    .map((name, i) => {
      const rec = records[name] ?? {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      const eloRank = i + 1;
      const officialRank = officialRankings[name] ?? null;
      const rankDiff = officialRank !== null ? officialRank - eloRank : null;
      return {
        rank: eloRank,
        officialRank,
        rankDiff,
        name,
        elo: ratings[name],
        wins: rec.wins,
        losses: rec.losses,
        ties: rec.ties ?? 0,
        upcoming: upcomingByTeam[normalize(name)] ?? [],
        isMyTeam: name === MY_TEAM,
      };
    })
    .sort((a, b) => {
      if (a.officialRank === null && b.officialRank === null) return 0;
      if (a.officialRank === null) return 1;
      if (b.officialRank === null) return -1;
      return a.officialRank - b.officialRank;
    });
}

export async function load(): Promise<PageData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  const { canonicalNames, officialRankings } = await fetchLeagueData(
    PUBLIC_SHEET_ID,
    PUBLIC_GOOGLE_API_KEY,
  );
  const { allMatches, weekRowsCache } = await fetchAllMatches(
    PUBLIC_SHEET_ID,
    PUBLIC_GOOGLE_API_KEY,
    WEEK_TABS,
    canonicalNames,
  );
  const { ratings, records } = processMatches(allMatches);
  const upcomingMatches = await resolveUpcoming(
    weekRowsCache,
    PUBLIC_SHEET_ID,
    PUBLIC_GOOGLE_API_KEY,
    ratings,
    canonicalNames,
  );
  const upcomingByTeam = buildUpcomingIndex(upcomingMatches);
  const leaderboard = buildLeaderboard(
    ratings,
    records,
    officialRankings,
    upcomingByTeam,
  );

  cached = {
    leaderboard,
    seasonLabel: SEASON_LABEL,
    lastUpdated: new Date().toISOString(),
    sheetUrl: SHEET_URL,
    myTeam: MY_TEAM,
  };
  cachedAt = Date.now();
  return cached;
}
```

- [ ] **Step 2: Confirm tests still pass**

```bash
npm test -- --reporter verbose
```

Expected: 29 passed, 0 failed.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "refactor(server): extract fetchLeagueData, fetchAllMatches, resolveUpcoming, buildUpcomingIndex, buildLeaderboard"
```

---

### Task 4: Create `src/app.css` and `src/routes/+layout.svelte`

**Files:**

- Create: `src/app.css`
- Create: `src/routes/+layout.svelte`

**Interfaces:**

- Produces: global styles available to all routes; `.layout` class usable in `+page.svelte`

- [ ] **Step 1: Create `src/app.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0b0e0b;
  color: #f0ece4;
  font-family: "Inter", system-ui, sans-serif;
  height: 100dvh;
  overflow: hidden;
}

.layout {
  height: 100dvh;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
}

@media (max-width: 600px) {
  body {
    height: auto;
    overflow: auto;
  }

  .layout {
    height: auto;
    padding-bottom: 2rem;
  }
}
```

- [ ] **Step 2: Create `src/routes/+layout.svelte`**

```svelte
<script lang="ts">
  import "../app.css";
  const { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app.css src/routes/+layout.svelte
git commit -m "refactor(styles): extract global CSS to src/app.css via new +layout.svelte"
```

---

### Task 5: Create leaf components — `PageHeader`, `SearchBar`, `GameLine`

**Files:**

- Create: `src/lib/components/PageHeader.svelte`
- Create: `src/lib/components/SearchBar.svelte`
- Create: `src/lib/components/GameLine.svelte`

**Interfaces:**

- Produces:
  - `PageHeader` — prop `seasonLabel: string`
  - `SearchBar` — prop `value: string` (bindable via `$bindable()`)
  - `GameLine` — props `court: string | null`, `opponent: string`, `prob: number`

- [ ] **Step 1: Create the components directory**

```bash
mkdir -p src/lib/components
```

- [ ] **Step 2: Create `src/lib/components/PageHeader.svelte`**

```svelte
<script lang="ts">
  const { seasonLabel }: { seasonLabel: string } = $props();
</script>

<header>
  <div class="deco">◆ ◆ ◆</div>
  <h1>STONEWALL <span class="accent">BOCCE</span></h1>
  <p class="season-label">
    ELO Power Rankings · {seasonLabel} · Pittsburgh, PA
  </p>
  <div class="deco">◆ ◆ ◆</div>
</header>

<style>
  header {
    flex-shrink: 0;
    text-align: center;
    padding: 1.25rem 0 0.75rem;
  }
  .deco {
    color: #d4a843;
    font-size: 0.72rem;
    letter-spacing: 0.6em;
    margin: 0.4rem 0;
  }
  h1 {
    font-family: "Playfair Display", serif;
    font-size: clamp(1.6rem, 6vw, 3rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    margin: 0;
    color: #f5f0e8;
    text-transform: uppercase;
    line-height: 1;
  }
  .accent {
    color: #4fc9a0;
  }
  .season-label {
    margin: 0.4rem 0 0;
    color: #d4a843;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 500;
  }
</style>
```

- [ ] **Step 3: Create `src/lib/components/SearchBar.svelte`**

```svelte
<script lang="ts">
  let { value = $bindable() }: { value: string } = $props();
</script>

<div class="search-wrap">
  <input
    type="search"
    placeholder="🔍 Search teams…"
    bind:value
    aria-label="Search teams"
  />
</div>

<style>
  .search-wrap {
    flex-shrink: 0;
    margin: 0 0 0.4rem;
  }
  input[type="search"] {
    width: 100%;
    background: #101510;
    border: 1px solid #253025;
    border-radius: 8px;
    color: #f0ece4;
    font-size: 0.95rem;
    padding: 0.55rem 0.8rem;
    outline: none;
    font-family: inherit;
  }
  input[type="search"]:focus {
    border-color: #d4a843;
  }
</style>
```

- [ ] **Step 4: Create `src/lib/components/GameLine.svelte`**

```svelte
<script lang="ts">
  const {
    court,
    opponent,
    prob,
  }: { court: string | null; opponent: string; prob: number } = $props();
</script>

<div class="game-line">
  {#if court}
    <span class="court">Ct {court}</span>
  {:else}
    <span class="court muted">–</span>
  {/if}
  <span class="opp">vs {opponent}</span>
  <span class:odds-fav={prob >= 50} class:odds-dog={prob < 50}>{prob}%</span>
</div>

<style>
  .game-line {
    display: grid;
    grid-template-columns: 2.8rem 1fr auto;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0;
  }
  .court {
    font-size: 0.7rem;
    color: #d4a843;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .opp {
    font-size: 0.78rem;
    color: #7a9a7a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .odds-fav {
    color: #4fc9a0;
    font-weight: 700;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }
  .odds-dog {
    color: #5a7a5a;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }
  .muted {
    color: #253025;
  }
</style>
```

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/PageHeader.svelte src/lib/components/SearchBar.svelte src/lib/components/GameLine.svelte
git commit -m "refactor(components): add PageHeader, SearchBar, GameLine leaf components"
```

---

### Task 6: Create `UpcomingGames.svelte`

**Files:**

- Create: `src/lib/components/UpcomingGames.svelte`

**Interfaces:**

- Consumes: `GameLine` from `./GameLine.svelte`; `UpcomingGame` from `$lib/types.js`
- Produces: prop `games: UpcomingGame[]` — renders game list or `–` when empty

- [ ] **Step 1: Create `src/lib/components/UpcomingGames.svelte`**

```svelte
<script lang="ts">
  import type { UpcomingGame } from "$lib/types.js";
  import GameLine from "./GameLine.svelte";

  const { games }: { games: UpcomingGame[] } = $props();
</script>

{#if games.length > 0}
  {#each games as game (game.opponent)}
    <GameLine court={game.court} opponent={game.opponent} prob={game.prob} />
  {/each}
{:else}
  <span class="muted">–</span>
{/if}

<style>
  .muted {
    color: #253025;
  }
</style>
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/UpcomingGames.svelte
git commit -m "refactor(components): add UpcomingGames component"
```

---

### Task 7: Create `TeamRow.svelte`

**Files:**

- Create: `src/lib/components/TeamRow.svelte`

**Interfaces:**

- Consumes: `UpcomingGames` from `./UpcomingGames.svelte`; `LeaderboardEntry` from `$lib/types.js`
- Produces: props `team: LeaderboardEntry`, `hasUpcoming: boolean` — renders one `<tr>`

- [ ] **Step 1: Create `src/lib/components/TeamRow.svelte`**

```svelte
<script lang="ts">
  import type { LeaderboardEntry } from "$lib/types.js";
  import UpcomingGames from "./UpcomingGames.svelte";

  const {
    team,
    hasUpcoming,
  }: { team: LeaderboardEntry; hasUpcoming: boolean } = $props();

  function rankDiffClass(diff: number | null): string {
    if (diff === null || diff === 0) return "";
    return diff > 0 ? "elo-better" : "elo-worse";
  }
</script>

<tr class:my-team={team.isMyTeam}>
  <td class="num official">{team.officialRank ?? "–"}</td>
  <td
    class="num rank {rankDiffClass(team.rankDiff)}"
    title={team.rankDiff !== null && team.rankDiff !== 0
      ? team.rankDiff > 0
        ? `ELO ranks ${team.rankDiff} spots higher than official`
        : `ELO ranks ${Math.abs(team.rankDiff)} spots lower than official`
      : ""}>{team.rank}</td
  >
  <td class="name"
    >{#if team.isMyTeam}🐕
    {/if}{team.name}</td
  >
  <td class="num elo">{team.elo}</td>
  <td class="num">{team.wins}</td>
  <td class="num">{team.losses}</td>
  <td class="num ties">{team.ties || "–"}</td>
  {#if hasUpcoming}
    <td class="this-wk">
      <UpcomingGames games={team.upcoming} />
    </td>
  {/if}
</tr>

<style>
  tr:hover {
    background: #0d150d;
  }
  tr.my-team {
    background: #1a1500 !important;
    box-shadow: inset 3px 0 0 #d4a843;
  }
  td {
    padding: 0.55rem 0.7rem;
    border-top: 1px solid #111911;
    vertical-align: middle;
  }
  tr.my-team td {
    border-top-color: #221d00;
  }
  .num {
    text-align: right;
  }
  .rank {
    color: #3a5a3a;
    font-size: 0.82rem;
  }
  .rank.elo-better {
    color: #4fc9a0;
    font-weight: 600;
  }
  .rank.elo-worse {
    color: #c05040;
    font-weight: 600;
  }
  .name {
    font-weight: 600;
    color: #ddd8d0;
  }
  tr.my-team .name {
    color: #d4a843;
  }
  .elo {
    font-weight: 700;
    color: #4fc9a0;
    font-variant-numeric: tabular-nums;
  }
  .ties {
    color: #3a5a3a;
  }
  .official {
    font-variant-numeric: tabular-nums;
    color: #5a7a5a;
  }
  .this-wk {
    padding-left: 1rem;
    min-width: 260px;
  }
  @media (max-width: 600px) {
    .this-wk {
      min-width: 0;
    }
  }
</style>
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/TeamRow.svelte
git commit -m "refactor(components): add TeamRow component"
```

---

### Task 8: Create `LeaderboardTable.svelte`

**Files:**

- Create: `src/lib/components/LeaderboardTable.svelte`

**Interfaces:**

- Consumes: `TeamRow` from `./TeamRow.svelte`; `LeaderboardEntry` from `$lib/types.js`
- Produces: props `entries: LeaderboardEntry[]`, `hasUpcoming: boolean`, `emptyMessage: string` — renders the full scrollable table

- [ ] **Step 1: Create `src/lib/components/LeaderboardTable.svelte`**

```svelte
<script lang="ts">
  import type { LeaderboardEntry } from "$lib/types.js";
  import TeamRow from "./TeamRow.svelte";

  const {
    entries,
    hasUpcoming,
    emptyMessage,
  }: {
    entries: LeaderboardEntry[];
    hasUpcoming: boolean;
    emptyMessage: string;
  } = $props();
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="num" title="Official league standings rank">Off.</th>
        <th class="num">ELO #</th>
        <th class="name">Team</th>
        <th class="num">ELO</th>
        <th class="num">W</th>
        <th class="num">L</th>
        <th class="num">T</th>
        {#if hasUpcoming}<th class="this-wk-head">This Week</th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each entries as team (team.name)}
        <TeamRow {team} {hasUpcoming} />
      {/each}
      {#if entries.length === 0}
        <tr>
          <td colspan={hasUpcoming ? 8 : 7} class="empty">{emptyMessage}</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border-radius: 10px;
    border: 1px solid #1a271a;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  thead {
    background: #0d150d;
  }
  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #0d150d;
  }
  th {
    padding: 0.6rem 0.7rem;
    text-align: left;
    color: #d4a843;
    font-weight: 600;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
  th.num {
    text-align: right;
  }
  th.this-wk-head {
    text-align: left;
    padding-left: 1rem;
  }
  .empty {
    text-align: center;
    color: #3a5a3a;
    padding: 2rem;
  }
  @media (max-width: 600px) {
    .table-wrap {
      flex: none;
      overflow-y: visible;
    }
  }
</style>
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/LeaderboardTable.svelte
git commit -m "refactor(components): add LeaderboardTable component"
```

---

### Task 9: Update `+page.svelte` to use components; remove extracted styles

**Files:**

- Modify: `src/routes/+page.svelte`

**Interfaces:**

- Consumes:
  - `PageHeader` from `$lib/components/PageHeader.svelte` — prop `seasonLabel: string`
  - `SearchBar` from `$lib/components/SearchBar.svelte` — bindable prop `value: string`
  - `LeaderboardTable` from `$lib/components/LeaderboardTable.svelte` — props `entries`, `hasUpcoming`, `emptyMessage`
- Produces: same rendered page — SvelteKit callers unchanged

- [ ] **Step 1: Replace `src/routes/+page.svelte` with the slimmed version**

```svelte
<script lang="ts">
  import type { PageData } from "./$types.js";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import LeaderboardTable from "$lib/components/LeaderboardTable.svelte";

  const { data }: { data: PageData } = $props();

  let search = $state("");

  const filtered = $derived(
    search.trim() === ""
      ? data.leaderboard
      : data.leaderboard.filter((t) =>
          t.name.toLowerCase().includes(search.trim().toLowerCase()),
        ),
  );

  const hasUpcoming = $derived(
    data.leaderboard.some((t) => t.upcoming.length > 0),
  );
</script>

<svelte:head>
  <title>{data.seasonLabel} · Stonewall Bocce ELO</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="layout">
  <PageHeader seasonLabel={data.seasonLabel} />
  <SearchBar bind:value={search} />
  <LeaderboardTable
    entries={filtered}
    {hasUpcoming}
    emptyMessage={`No teams match "${search}" 🤷`}
  />
  <footer>
    <p>
      <span class="elo-better">Green ELO #</span> = ELO ranks higher than
      official · <span class="elo-worse">Red ELO #</span> = ELO ranks lower · ELO
      accounts for score margins
    </p>
    <p>
      Updated {new Date(data.lastUpdated).toLocaleString()} ·
      <a href={data.sheetUrl} target="_blank" rel="noopener noreferrer"
        >Source Spreadsheet ↗</a
      >
    </p>
  </footer>
</div>

<style>
  footer {
    flex-shrink: 0;
    text-align: center;
    color: #3a5a3a;
    font-size: 0.72rem;
    padding: 0.5rem 0 0.75rem;
    line-height: 1.7;
  }
  footer p {
    margin: 0;
  }
  footer a {
    color: #d4a843;
    text-decoration: none;
  }
  footer a:hover {
    text-decoration: underline;
  }
  .elo-better {
    color: #4fc9a0;
  }
  .elo-worse {
    color: #c05040;
  }
</style>
```

- [ ] **Step 2: Confirm tests still pass**

```bash
npm test -- --reporter verbose
```

Expected: 29 passed, 0 failed.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Full build check**

```bash
npm run build
```

Expected: build succeeds with no TypeScript or Svelte errors. Warnings about unused CSS selectors (if any) are acceptable; errors are not.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "refactor(page): replace monolithic +page.svelte with component composition"
```
