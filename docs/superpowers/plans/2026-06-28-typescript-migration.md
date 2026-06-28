# TypeScript Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all JavaScript source files to TypeScript with strict types, custom domain types, and fully annotated function signatures.

**Architecture:** All shared domain types live in `src/lib/types.ts`; each lib module imports only the types it needs. Config files (`svelte.config.js`) stay as JS since SvelteKit's tooling requires it; all application source and test files become `.ts`. TypeScript operates in strict mode via a `tsconfig.json` that extends the auto-generated `.svelte-kit/tsconfig.json`.

**Tech Stack:** TypeScript (strict), SvelteKit 2, Svelte 5, Vite 8, Vitest 4

## Global Constraints

- `strict: true` in tsconfig — no `any`, no implicit `any`
- Use `.js` extensions in all relative import paths (TypeScript's bundler resolution finds `.ts` files via `.js` imports)
- `svelte.config.js` stays as `.js` — SvelteKit tooling requires it
- All `git mv` renames must be verified with `git status` before committing
- Run `npm test` after every task to confirm no regressions

---

### Task 1: TypeScript tooling setup

**Files:**

- Create: `tsconfig.json`
- Modify: `package.json` — add `typescript` and `@types/node` to devDependencies

**Interfaces:**

- Produces: TypeScript compiler available; `tsconfig.json` extends `.svelte-kit/tsconfig.json` which provides `$lib` and `$env` path aliases

- [ ] **Step 1: Install TypeScript and node types**

```bash
npm install --save-dev typescript @types/node
```

Expected output: updated `package-lock.json`, no errors.

- [ ] **Step 2: Verify SvelteKit has generated its tsconfig base**

```bash
npx svelte-kit sync
ls .svelte-kit/tsconfig.json
```

Expected: file exists. If it doesn't, run `npm run build` first to trigger generation.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "allowJs": false,
    "skipLibCheck": true,
    "sourceMap": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ESNext"
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "vite.config.ts"]
}
```

- [ ] **Step 4: Confirm tsc can find the project (type-checking will fail until files are migrated — that's expected)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about `.js` files not being included — that's correct since `allowJs: false`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "chore: add TypeScript tooling and tsconfig"
```

---

### Task 2: Create shared types file

**Files:**

- Create: `src/lib/types.ts`

**Interfaces:**

- Produces: `Match`, `ScheduledMatch`, `MatchupWithCourt`, `TeamRecord`, `Ratings`, `Records`, `WeeklyRatings`, `OfficialRankings`, `ProcessMatchesResult`, `UpcomingGame`, `LeaderboardEntry`, `PageData` — all exported from `$lib/types.js`

- [ ] **Step 1: Create `src/lib/types.ts`**

```typescript
export type Match = {
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  forfeitA: boolean;
  forfeitB: boolean;
  weekIndex?: number;
};

export type ScheduledMatch = {
  teamA: string;
  teamB: string;
};

export type MatchupWithCourt = {
  teamA: string;
  teamB: string;
  court: string | null;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type Ratings = Record<string, number>;
export type Records = Record<string, TeamRecord>;
export type WeeklyRatings = Record<string, number[]>;
export type OfficialRankings = Record<string, number>;

export type ProcessMatchesResult = {
  ratings: Ratings;
  records: Records;
  weeklyRatings: WeeklyRatings;
};

export type UpcomingGame = {
  opponent: string;
  prob: number;
  court: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  officialRank: number | null;
  rankDiff: number | null;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  upcoming: UpcomingGame[];
  isMyTeam: boolean;
};

export type PageData = {
  leaderboard: LeaderboardEntry[];
  seasonLabel: string;
  lastUpdated: string;
  sheetUrl: string;
  myTeam: string;
};
```

- [ ] **Step 2: Run existing tests to confirm no regressions yet**

```bash
npm test
```

Expected: all existing tests pass (types.ts adds no runtime behaviour).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript domain types"
```

---

### Task 3: Migrate config.js → config.ts

**Files:**

- Rename+modify: `src/lib/config.js` → `src/lib/config.ts`

**Interfaces:**

- Consumes: nothing
- Produces: same exports as before, now typed — `WEEK_TABS: string[]`, `UPCOMING_TAB: string | null`

- [ ] **Step 1: Rename file**

```bash
git mv src/lib/config.js src/lib/config.ts
```

- [ ] **Step 2: Replace file content with typed version**

```typescript
const SHEET_ID = "1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs";

export const SEASON_LABEL = "Season 10";

export const SUMMARY_TAB = "Standings";

export const WEEK_TABS: string[] = [
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
  "Week 7",
];

export const UPCOMING_TAB: string | null = "Week 8";

export const RANKINGS_NAME_COL = 3;
export const RANKINGS_RANK_COL = 1;

export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;

export const MY_TEAM = "Walter and the Bocce Bunch";
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/config.ts
git commit -m "chore: migrate config.js to TypeScript"
```

---

### Task 4: Migrate names.js → names.ts

**Files:**

- Rename+modify: `src/lib/names.js` → `src/lib/names.ts`
- Rename+modify: `src/tests/names.test.js` → `src/tests/names.test.ts`

**Interfaces:**

- Consumes: nothing (no type imports needed)
- Produces: `normalize(name: string): string`, `canonicalize(name: string, canonicalNames: string[]): string`, `ALIASES: Record<string, string>`

- [ ] **Step 1: Rename both files**

```bash
git mv src/lib/names.js src/lib/names.ts
git mv src/tests/names.test.js src/tests/names.test.ts
```

- [ ] **Step 2: Replace names.ts content**

```typescript
export const ALIASES: Record<string, string> = {
  // Truncated cell values (sheet columns too narrow for full name)
  "1 ball 2 balls": "1 Ball, 2 Balls, Red Balls, Blue Balls",
  "boccer i barely": "Bocce-r? I barely know her!",
  "boccer i barely know": "Bocce-r? I barely know her!",
  "i wanna dance": "I Wanna Dance With Some Bocce",
  "i wanna dance w": "I Wanna Dance With Some Bocce",
  "ingaysion of the": "InGaysion of the Bocce Snatchers",
  "ingaysion of the bocce": "InGaysion of the Bocce Snatchers",
  "itty bitty bocce": "Itty Bitty Bocce Committee",
  slobberknockin: "Slobberknockin on Ediballs",
  "slobberknockin on": "Slobberknockin on Ediballs",
  "teeny weenie": "Teeny Weenie Pallinis",
  "walter and bocce bunch": "Walter and the Bocce Bunch",
  "walter and the bocce": "Walter and the Bocce Bunch",

  // Typos and misspellings found in match data
  "ball time high": "Balltime High",
  balls5eva: "Ballz5Eva",
  "deeped throwed it": "Deep Throwed It",
  "irratable bocce syndrome": "Irritable Bocce Syndrome",
  "love is bocce field": "Love is a Bocce Field",
  "resting bocce face": "Resting Bocce Faces",
  "son of beocce": "Son of a Be-occe",
  "teeny weenies pallinis": "Teeny Weenie Pallinis",
  "throws of depair": "Throws of Despair",

  // L&O variants: 'L&O: SHU' → 'lo shu', 'L & O: Special Homo Unit' → 'l o special homo unit'
  "lo shu": "Lawn Order: Special Homo Unit",
  "lo special homo unit": "Lawn Order: Special Homo Unit",
  "l o special homo unit": "Lawn Order: Special Homo Unit",
  "lo pi": "Lawn and Order: Pallina Intent",
  "lo pallina intent": "Lawn and Order: Pallina Intent",
  "l o pallina intent": "Lawn and Order: Pallina Intent",
};

export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalize(name: string, canonicalNames: string[]): string {
  const n = normalize(name);

  if (ALIASES[n]) return ALIASES[n];

  for (const canonical of canonicalNames) {
    if (normalize(canonical) === n) return canonical;
  }

  console.warn(`[names] Unknown team name: "${name}"`);
  return name;
}
```

- [ ] **Step 3: Update names.test.ts imports (change .js extension to .js — stays the same since TS resolves it)**

Open `src/tests/names.test.ts` and verify the import line reads:

```typescript
import { normalize, canonicalize, ALIASES } from "../lib/names.js";
```

No change needed — TypeScript resolves `names.js` to `names.ts` automatically with bundler resolution.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/names.ts src/tests/names.test.ts
git commit -m "chore: migrate names.js to TypeScript"
```

---

### Task 5: Migrate elo.js → elo.ts + elo.test.js → elo.test.ts

**Files:**

- Rename+modify: `src/lib/elo.js` → `src/lib/elo.ts`
- Rename+modify: `src/tests/elo.test.js` → `src/tests/elo.test.ts`

**Interfaces:**

- Consumes: `Match`, `Ratings`, `Records`, `WeeklyRatings`, `ProcessMatchesResult`, `TeamRecord` from `./types.js`
- Produces: `expectedScore(ratingA: number, ratingB: number): number`, `marginMultiplier(winnerScore: number, loserScore: number): number`, `processMatches(matches: Match[]): ProcessMatchesResult`

- [ ] **Step 1: Rename files**

```bash
git mv src/lib/elo.js src/lib/elo.ts
git mv src/tests/elo.test.js src/tests/elo.test.ts
```

- [ ] **Step 2: Replace elo.ts content**

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

export function processMatches(matches: Match[]): ProcessMatchesResult {
  const ratings: Ratings = {};
  const records: Records = {};
  const weeklyRatings: WeeklyRatings = {};
  const weekAppearances: Record<number, Record<string, number>> = {};

  for (const match of matches) {
    const { teamA, teamB, scoreA, scoreB, forfeitA, forfeitB, weekIndex } =
      match;

    initTeam(ratings, records, weeklyRatings, teamA);
    initTeam(ratings, records, weeklyRatings, teamB);

    if (weekIndex !== undefined) {
      if (!weekAppearances[weekIndex]) weekAppearances[weekIndex] = {};
      weekAppearances[weekIndex][teamA] =
        (weekAppearances[weekIndex][teamA] ?? 0) + 1;
      weekAppearances[weekIndex][teamB] =
        (weekAppearances[weekIndex][teamB] ?? 0) + 1;
      if (weekAppearances[weekIndex][teamA] > 2)
        console.warn(
          `[elo] ${teamA} appears more than 2 times in week ${weekIndex}`,
        );
      if (weekAppearances[weekIndex][teamB] > 2)
        console.warn(
          `[elo] ${teamB} appears more than 2 times in week ${weekIndex}`,
        );
    }

    const rA = ratings[teamA];
    const rB = ratings[teamB];
    const eA = expectedScore(rA, rB);
    const eB = 1 - eA;

    let actualA: number, actualB: number, mult: number;

    if (forfeitA) {
      actualA = 0;
      actualB = 1;
      mult = 1.0;
      records[teamA].losses++;
      records[teamB].wins++;
    } else if (forfeitB) {
      actualA = 1;
      actualB = 0;
      mult = 1.0;
      records[teamA].wins++;
      records[teamB].losses++;
    } else if (scoreA === scoreB) {
      // Both null only when both are forfeits, handled above; in the non-forfeit path these are numbers
      actualA = 0.5;
      actualB = 0.5;
      mult = 1.0;
      records[teamA].ties++;
      records[teamB].ties++;
      records[teamA].pointsFor += scoreA!;
      records[teamA].pointsAgainst += scoreB!;
      records[teamB].pointsFor += scoreB!;
      records[teamB].pointsAgainst += scoreA!;
    } else {
      actualA = scoreA! > scoreB! ? 1 : 0;
      actualB = scoreB! > scoreA! ? 1 : 0;
      mult = marginMultiplier(
        Math.max(scoreA!, scoreB!),
        Math.min(scoreA!, scoreB!),
      );

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
    }

    ratings[teamA] = Math.round(rA + K * mult * (actualA - eA));
    ratings[teamB] = Math.round(rB + K * mult * (actualB - eB));

    weeklyRatings[teamA].push(ratings[teamA]);
    weeklyRatings[teamB].push(ratings[teamB]);
  }

  return { ratings, records, weeklyRatings };
}
```

- [ ] **Step 3: Update elo.test.ts — rename import extension (no change needed, `.js` still resolves)**

Verify `src/tests/elo.test.ts` import line:

```typescript
import { expectedScore, marginMultiplier, processMatches } from "../lib/elo.js";
```

No content change needed.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/elo.ts src/tests/elo.test.ts
git commit -m "chore: migrate elo.js to TypeScript"
```

---

### Task 6: Migrate sheets.js → sheets.ts + sheets.test.js → sheets.test.ts

**Files:**

- Rename+modify: `src/lib/sheets.js` → `src/lib/sheets.ts`
- Rename+modify: `src/tests/sheets.test.js` → `src/tests/sheets.test.ts`

**Interfaces:**

- Consumes: `Match`, `MatchupWithCourt`, `ScheduledMatch`, `OfficialRankings` from `./types.js`
- Produces:
  - `fetchTab(sheetId: string, apiKey: string, tabName: string): Promise<string[][]>`
  - `parseMatch(row: string[], colOffset: number): Match | null`
  - `parseMatchTab(rows: string[][]): Match[]`
  - `getCanonicalTeams(sheetId: string, apiKey: string, summaryTab: string, nameCol: number): Promise<string[]>`
  - `getOfficialRankings(sheetId: string, apiKey: string, summaryTab: string, nameCol: number, rankCol: number): Promise<OfficialRankings>`
  - `parseScheduledMatch(row: string[], colOffset: number): ScheduledMatch | null`
  - `parseMatchupsWithCourts(rows: string[][]): MatchupWithCourt[]`
  - `parseScheduledMatchTab(rows: string[][]): ScheduledMatch[]`

- [ ] **Step 1: Rename files**

```bash
git mv src/lib/sheets.js src/lib/sheets.ts
git mv src/tests/sheets.test.js src/tests/sheets.test.ts
```

- [ ] **Step 2: Replace sheets.ts content**

```typescript
import type {
  Match,
  MatchupWithCourt,
  ScheduledMatch,
  OfficialRankings,
} from "./types.js";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export async function fetchTab(
  sheetId: string,
  apiKey: string,
  tabName: string,
): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(tabName)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(
      `Sheets API error for tab "${tabName}": ${res.status} ${res.statusText}`,
    );
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

export function parseMatch(row: string[], colOffset: number): Match | null {
  const teamA = row[colOffset + 1]?.trim();
  const teamB = row[colOffset + 3]?.trim();
  if (!teamA || !teamB) return null;

  const rawA = row[colOffset + 2]?.trim() ?? "";
  const rawB = row[colOffset + 4]?.trim() ?? "";

  const forfeitA = rawA.toUpperCase() === "F";
  const forfeitB = rawB.toUpperCase() === "F";

  if (!forfeitA && !forfeitB) {
    if (!rawA && !rawB) return null;
    const scoreA = parseInt(rawA, 10);
    const scoreB = parseInt(rawB, 10);
    if (isNaN(scoreA) || isNaN(scoreB)) return null;
    return { teamA, teamB, scoreA, scoreB, forfeitA: false, forfeitB: false };
  }

  return { teamA, teamB, scoreA: null, scoreB: null, forfeitA, forfeitB };
}

export function parseMatchTab(rows: string[][]): Match[] {
  const matches: Match[] = [];
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    // Actual sheet layout: [blank, court#, teamA, scoreA, teamB, scoreB, blank, teamA2, scoreA2, teamB2, scoreB2]
    const left = parseMatch(row, 1);
    if (left) matches.push(left);
    const right = parseMatch(row, 6);
    if (right) matches.push(right);
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
    if (name) names.add(name);
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
    if (name && !isNaN(rank)) rankings[name] = rank;
  }
  return rankings;
}

export function parseScheduledMatch(
  row: string[],
  colOffset: number,
): ScheduledMatch | null {
  const teamA = row[colOffset + 1]?.trim();
  const teamB = row[colOffset + 3]?.trim();
  if (!teamA || !teamB) return null;
  const rawA = row[colOffset + 2]?.trim() ?? "";
  const rawB = row[colOffset + 4]?.trim() ?? "";
  if (!rawA && !rawB) return { teamA, teamB };
  return null;
}

// Returns all matchup pairs with court numbers regardless of score status.
// Layout: col0=blank, col1=court#, col2=teamA, col3=scoreA, col4=teamB, col5=scoreB,
//         col6=blank, col7=teamA2, col8=scoreA2, col9=teamB2, col10=scoreB2
// Each row is one court; left block = game 1, right block = game 2 (after swap).
// Both games on a row use the same court number.
export function parseMatchupsWithCourts(rows: string[][]): MatchupWithCourt[] {
  const game1: MatchupWithCourt[] = [];
  const game2: MatchupWithCourt[] = [];
  for (const row of rows) {
    if (!row || row.length < 5) continue;
    const court = row[1]?.trim() || null;
    const leftA = row[2]?.trim();
    const leftB = row[4]?.trim();
    if (leftA && leftB) game1.push({ teamA: leftA, teamB: leftB, court });
    const rightA = row[7]?.trim();
    const rightB = row[9]?.trim();
    if (rightA && rightB) game2.push({ teamA: rightA, teamB: rightB, court });
  }
  return [...game1, ...game2];
}

export function parseScheduledMatchTab(rows: string[][]): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    const left = parseScheduledMatch(row, 1);
    if (left) matches.push(left);
    const right = parseScheduledMatch(row, 6);
    if (right) matches.push(right);
  }
  return matches;
}
```

- [ ] **Step 3: Verify sheets.test.ts import (no change needed)**

Confirm `src/tests/sheets.test.ts` import:

```typescript
import { parseMatch, parseMatchTab } from "../lib/sheets.js";
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts src/tests/sheets.test.ts
git commit -m "chore: migrate sheets.js to TypeScript"
```

---

### Task 7: Migrate +page.server.js → +page.server.ts

**Files:**

- Rename+modify: `src/routes/+page.server.js` → `src/routes/+page.server.ts`

**Interfaces:**

- Consumes: `Match`, `LeaderboardEntry`, `UpcomingGame`, `PageData`, `OfficialRankings` from `$lib/types.js`; all functions from `$lib/sheets.js`, `$lib/names.js`, `$lib/elo.js`, `$lib/config.js`
- Produces: `load(): Promise<PageData>` (SvelteKit server load function)

- [ ] **Step 1: Rename file**

```bash
git mv src/routes/+page.server.js src/routes/+page.server.ts
```

- [ ] **Step 2: Replace content of +page.server.ts**

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
  LeaderboardEntry,
  UpcomingGame,
  PageData,
} from "$lib/types.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: PageData | null = null;
let cachedAt = 0;

export async function load(): Promise<PageData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  let canonicalNames: string[] = [];
  try {
    canonicalNames = await getCanonicalTeams(
      PUBLIC_SHEET_ID,
      PUBLIC_GOOGLE_API_KEY,
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
      PUBLIC_SHEET_ID,
      PUBLIC_GOOGLE_API_KEY,
      SUMMARY_TAB,
      RANKINGS_NAME_COL,
      RANKINGS_RANK_COL,
    );
  } catch (err) {
    console.warn(
      `[load] Could not fetch official rankings: ${(err as Error).message}`,
    );
  }

  const allMatches: Match[] = [];
  const weekRowsCache: { weekIndex: number; rows: string[][] }[] = [];

  for (let i = 0; i < WEEK_TABS.length; i++) {
    let rows: string[][];
    try {
      rows = await fetchTab(
        PUBLIC_SHEET_ID,
        PUBLIC_GOOGLE_API_KEY,
        WEEK_TABS[i],
      );
    } catch (err) {
      console.warn(
        `[load] Skipping tab "${WEEK_TABS[i]}": ${(err as Error).message}`,
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

  const { ratings, records, weeklyRatings } = processMatches(allMatches);

  const resolveMatchups = (
    rows: string[][],
  ): Array<{
    teamA: string;
    teamB: string;
    court: string | null;
    probA: number;
  }> =>
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

  let upcomingMatches: Array<{
    teamA: string;
    teamB: string;
    court: string | null;
    probA: number;
  }> = [];
  if (UPCOMING_TAB) {
    try {
      const rows = await fetchTab(
        PUBLIC_SHEET_ID,
        PUBLIC_GOOGLE_API_KEY,
        UPCOMING_TAB,
      );
      upcomingMatches = resolveMatchups(rows);
    } catch (err) {
      console.warn(
        `[load] Could not fetch upcoming tab "${UPCOMING_TAB}": ${(err as Error).message}`,
      );
    }
  } else {
    for (let i = weekRowsCache.length - 1; i >= 0; i--) {
      const { rows } = weekRowsCache[i];
      if (parseMatchupsWithCourts(rows).length > 0) {
        upcomingMatches = resolveMatchups(rows);
        break;
      }
    }
  }

  const upcomingByTeam: Record<string, UpcomingGame[]> = {};
  const addUpcoming = (key: string, entry: UpcomingGame): void => {
    const k = normalize(key);
    if (!upcomingByTeam[k]) upcomingByTeam[k] = [];
    upcomingByTeam[k].push(entry);
  };
  for (const m of upcomingMatches) {
    addUpcoming(m.teamA, { opponent: m.teamB, prob: m.probA, court: m.court });
    addUpcoming(m.teamB, {
      opponent: m.teamA,
      prob: 100 - m.probA,
      court: m.court,
    });
  }

  const leaderboard: LeaderboardEntry[] = Object.keys(ratings)
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

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass (server load function is not directly tested by unit tests).

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "chore: migrate +page.server.js to TypeScript"
```

---

### Task 8: Migrate vite.config.js → vite.config.ts

**Files:**

- Rename+modify: `vite.config.js` → `vite.config.ts`

**Interfaces:**

- Consumes: `defineConfig` from `vite`, `sveltekit` from `@sveltejs/kit/vite`
- Produces: default export typed Vite config (no behaviour change)

- [ ] **Step 1: Rename file**

```bash
git mv vite.config.js vite.config.ts
```

- [ ] **Step 2: The content needs no changes** — it's already valid TypeScript:

```typescript
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    passWithNoTests: true,
  },
});
```

- [ ] **Step 3: Update tsconfig.json to include vite.config.ts (already included by the `include` array from Task 1)**

Confirm `tsconfig.json` includes field:

```json
"include": ["src/**/*.ts", "src/**/*.svelte", "vite.config.ts"]
```

- [ ] **Step 4: Run tests and full type check**

```bash
npm test && npx tsc --noEmit
```

Expected: all tests pass, zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts tsconfig.json
git commit -m "chore: migrate vite.config.js to TypeScript"
```

---

### Task 9: Final verification

**Files:**

- Verify: no `.js` source files remain in `src/` (except `src/app.html` which is HTML, not JS)
- Verify: `svelte.config.js` intentionally stays as JS

- [ ] **Step 1: Confirm no stray .js source files remain**

```bash
find src -name "*.js" | sort
```

Expected: empty output (no JS files left under `src/`).

- [ ] **Step 2: Full type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Build to confirm Vite/SvelteKit compilation succeeds**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Final commit if any loose files remain unstaged**

```bash
git status
```

If clean, no commit needed. If any files were missed, stage and commit:

```bash
git add <any remaining files>
git commit -m "chore: complete TypeScript migration"
```
