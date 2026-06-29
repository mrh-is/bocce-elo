# Code Review Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all findings from the 2026-06-29 code review: dead code, type safety, CSS duplication, logic clarity, and missing test coverage.

**Architecture:** All changes are isolated refactors and cleanups within the existing SvelteKit/Cloudflare Pages app. No new runtime dependencies. Each task is independently safe to commit and deploy.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript, Vitest, Cloudflare Pages

## Global Constraints

- Run `npm run test` after every task to verify no regressions
- Run `npm run lint` (prettier + eslint) before every commit — or run `npm run format` first if the linter complains about formatting
- Do not change observable behavior: leaderboard output, ELO values, and UI appearance must remain identical after each task
- All test commands from repo root: `npm run test` for all tests, `npx vitest run src/tests/<file>.test.ts` for a single file

---

## Task 1: Export `STARTING_RATING` and remove `weeklyRatings`

`elo.ts` defines `STARTING_RATING = 1000` but doesn't export it. `league.ts` hardcodes `1000` in three places. `processMatches` also tracks per-game rating history in `weeklyRatings` but nothing in the codebase ever reads it — it's pure wasted allocation.

**Files:**

- Modify: `src/lib/elo.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/league.ts`
- Test: `src/tests/elo.test.ts` (no new tests; existing tests verify the refactor is safe)

**Interfaces:**

- Produces: `STARTING_RATING` exported from `src/lib/elo.ts`; `ProcessMatchesResult` no longer contains `weeklyRatings`

- [ ] **Step 1: Verify existing tests pass before touching anything**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Export `STARTING_RATING` and remove `weeklyRatings` from `elo.ts`**

Replace the contents of `src/lib/elo.ts` with the version below. Key changes:

- Add `export` to `STARTING_RATING`
- Remove `weeklyRatings` parameter from `initTeam`
- Remove `weeklyRatings` local variable, tracking, and return value from `processMatches`

```typescript
import type { Match, Ratings, Records, ProcessMatchesResult } from "./types.js";

export const STARTING_RATING = 1000;
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

function initTeam(ratings: Ratings, records: Records, name: string): void {
  if (!ratings[name]) {
    ratings[name] = STARTING_RATING;
    records[name] = {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
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
  const weekAppearances: Record<number, Record<string, number>> = {};

  for (const match of matches) {
    const { teamA, teamB, weekIndex } = match;

    initTeam(ratings, records, teamA);
    initTeam(ratings, records, teamB);

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
  }

  return { ratings, records };
}
```

- [ ] **Step 3: Remove `WeeklyRatings` from `types.ts`**

In `src/lib/types.ts`, remove the `WeeklyRatings` type alias and remove it from `ProcessMatchesResult`:

```typescript
export interface Match {
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  forfeitA: boolean;
  forfeitB: boolean;
  weekIndex?: number;
}

export interface ScheduledMatch {
  teamA: string;
  teamB: string;
}

export interface MatchupWithCourt {
  teamA: string;
  teamB: string;
  court: string | null;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export type Ratings = Record<string, number>;
export type Records = Record<string, TeamRecord>;
export type OfficialRankings = Record<string, number>;

export interface ProcessMatchesResult {
  ratings: Ratings;
  records: Records;
}

export interface UpcomingGame {
  opponent: string;
  prob: number;
  court: string | null;
}

export interface LeaderboardEntry {
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
}

export interface PageData {
  leaderboard: LeaderboardEntry[];
  seasonLabel: string;
  lastUpdated: Date;
  sheetUrl: string;
  myTeam: string;
}
```

- [ ] **Step 4: Update `league.ts` to import `STARTING_RATING`**

In `src/lib/league.ts`, add `STARTING_RATING` to the import from `elo.js` and replace the three `1000` literals:

Change the import at line 1:

```typescript
import { expectedScore, processMatches, STARTING_RATING } from "./elo.js";
```

Change the `toUpcomingMatchups` function (the `?? 1000` fallbacks):

```typescript
const ratingA = ratings[teamA] ?? STARTING_RATING;
const ratingB = ratings[teamB] ?? STARTING_RATING;
```

Change the loop in `buildLeaguePageData` that seeds teams with no matches:

```typescript
for (const name of canonicalNames) {
  if (!(name in ratings)) {
    ratings[name] = STARTING_RATING;
    records[name] = {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify no regressions**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/elo.ts src/lib/types.ts src/lib/league.ts
git commit -m "refactor(elo): export STARTING_RATING, remove unused weeklyRatings tracking"
```

---

## Task 2: Remove dead code

Three categories: the unused `ScheduledMatch` type, unreachable fallback logic in `buildLeaderboard`, and two CSS variables defined in every theme block but never referenced in any component.

**Files:**

- Modify: `src/lib/types.ts`
- Modify: `src/lib/league.ts`
- Modify: `src/app.css`

**Interfaces:**

- Consumes: Nothing — these are all purely additive removals

- [ ] **Step 1: Remove `ScheduledMatch` from `types.ts`**

In `src/lib/types.ts`, delete the `ScheduledMatch` interface (it is exported but imported nowhere):

```typescript
// DELETE these four lines:
export interface ScheduledMatch {
  teamA: string;
  teamB: string;
}
```

- [ ] **Step 2: Remove dead fallbacks from `buildLeaderboard` in `league.ts`**

In `buildLeaderboard`, `records[name]` is always populated before this function runs (guaranteed by `processMatches` initializing on first encounter and by the seed loop in `buildLeaguePageData`). Remove the unreachable fallback object and the redundant `?? 0`:

Find and replace the `map` callback inside `buildLeaderboard`. Change:

```typescript
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
  ties: record.ties ?? 0,
  upcoming: upcomingByTeam[normalize(name)] ?? [],
  isMyTeam: name === myTeam,
};
```

To:

```typescript
const record = records[name];
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
```

- [ ] **Step 3: Remove unused CSS variables from `app.css`**

`--surface-my-team` and `--border-my-team` are declared in all four theme blocks (`:root`, dark media query, `[data-theme="dark"]`, `[data-theme="light"]`) but used nowhere. Remove them from each block.

In the `:root` block, delete:

```css
--surface-my-team: #eef3ff;
--border-my-team: #2563eb;
```

In the `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` block, delete:

```css
--surface-my-team: #0f1e3a;
--border-my-team: #60a5fa;
```

In the `[data-theme="dark"]` block, delete:

```css
--surface-my-team: #0f1e3a;
--border-my-team: #60a5fa;
```

In the `[data-theme="light"]` block, delete:

```css
--surface-my-team: #eef3ff;
--border-my-team: #2563eb;
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/league.ts src/app.css
git commit -m "chore: remove dead code (ScheduledMatch type, unreachable fallbacks, unused CSS vars)"
```

---

## Task 3: Deduplicate CSS theme blocks

`app.css` declares all light-mode variable values twice: once in `:root` (the default) and again in `[data-theme="light"]` (explicit override). The two blocks are identical. Any color edit must be made in two places. Fix: delete `[data-theme="light"]` entirely — `:root` already sets the light-mode defaults, and nothing overrides them unless `[data-theme="dark"]` is active.

**Files:**

- Modify: `src/app.css`

- [ ] **Step 1: Delete the `[data-theme="light"]` block from `app.css`**

Remove the entire `[data-theme="light"]` block (approximately lines 107–132 at time of writing — find it by the selector):

```css
/* DELETE this entire block: */
[data-theme="light"] {
  --surface-0: #e8f7e4;
  --surface-1: #f5fbf3;
  --surface-2: #eef8ea;
  --surface-card: #ffffff;
  --border: #c2e0bb;
  --border-subtle: #d8eed4;
  --border-muted: #aacfa3;
  --accent: #2563eb;
  --win: #1a8c3c;
  --loss: #d42b1a;
  --pallino: #ffd23f;
  --text: #1a2e1c;
  --text-heading: #ffffff;
  --text-sub: #2c4a2e;
  --text-dim: #7a9e7e;
  --text-mid: #4a7050;
  --text-light: #6b8c70;
  --scrollbar-thumb: #aacfa3;
  --scrollbar-track: transparent;

  --header-bg: #1e7238;
  --header-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}
```

- [ ] **Step 2: Verify the theme switcher still works**

Run the dev server and manually toggle between light/dark mode:

```bash
npm run dev
```

Open `http://localhost:5173`. Click the theme switcher. Confirm light → dark → light works correctly with no visual regressions.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "style: remove duplicate [data-theme=\"light\"] CSS block (`:root` is the canonical default)"
```

---

## Task 4: Simplify `TeamRow` helper functions

`TeamRow.svelte` defines a `compareDiff` helper that both `rankDiffClass` and `hoverText` delegate to. This indirection forces a `diff!` non-null assertion in `hoverText` because TypeScript can't see through `compareDiff` to know that the template strings are only evaluated when `diff` is non-null. Inline both functions.

**Files:**

- Modify: `src/lib/components/TeamRow.svelte`

- [ ] **Step 1: Replace the three helper functions in `TeamRow.svelte`**

In the `<script lang="ts">` block, find and delete `compareDiff`, `rankDiffClass`, and `hoverText`. Replace them with:

```typescript
function rankDiffClass(diff: number | null): string {
  if (diff === null || diff === 0) return "";
  return diff > 0 ? "elo-better" : "elo-worse";
}

function hoverText(diff: number | null): string {
  if (diff === null || diff === 0) return "";
  return diff > 0
    ? `ELO ranks ${diff} spots higher than official`
    : `ELO ranks ${Math.abs(diff)} spots lower than official`;
}
```

- [ ] **Step 2: Run lint to catch any TypeScript errors**

```bash
npm run lint
```

Expected: no errors. If prettier complains about formatting, run `npm run format` first.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/TeamRow.svelte
git commit -m "refactor(ui): inline rankDiffClass and hoverText, removing compareDiff indirection"
```

---

## Task 5: Clarify `buildLeaderboard` sort logic

`buildLeaderboard` in `league.ts` currently sorts by ELO (to assign `eloRank` via array index), then re-sorts by official rank. The intent is obscured by the fact that the ELO-sorted array is used only as a side effect of the `.map`. Make the two-pass intent explicit: first compute the ELO rank map, then build and sort the entries.

**Files:**

- Modify: `src/lib/league.ts`
- Test: `src/tests/league.test.ts`

- [ ] **Step 1: Write a test that pins the `rank` field as ELO rank (not row position)**

In `src/tests/league.test.ts`, add this test inside `describe("buildLeaguePageData")`:

```typescript
it("rank field reflects ELO position, independent of row order (which follows official rank)", () => {
  // Alpha beats Beta; official standings rank Beta #1, Alpha #2
  // So rows are ordered Beta, Alpha — but rank fields should be Alpha=1, Beta=2 by ELO
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
```

- [ ] **Step 2: Run the new test to verify it passes against the current code**

```bash
npx vitest run src/tests/league.test.ts
```

Expected: PASS — this test documents existing correct behavior; it should pass before any refactor.

- [ ] **Step 3: Refactor `buildLeaderboard` to make the two-pass intent explicit**

In `src/lib/league.ts`, replace the `buildLeaderboard` function with:

```typescript
function buildLeaderboard(
  ratings: Ratings,
  records: Records,
  officialRankings: Record<string, number>,
  upcomingByTeam: Record<string, UpcomingGame[]>,
  myTeam: string,
): LeaderboardEntry[] {
  const eloSorted = Object.keys(ratings).sort(
    (a, b) => ratings[b] - ratings[a],
  );
  const eloRankByName = Object.fromEntries(
    eloSorted.map((name, i) => [name, i + 1]),
  );

  return eloSorted
    .map((name) => {
      const record = records[name];
      const eloRank = eloRankByName[name];
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
      if (a.officialRank === null && b.officialRank === null) return 0;
      if (a.officialRank === null) return 1;
      if (b.officialRank === null) return -1;
      return a.officialRank - b.officialRank;
    });
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/league.ts src/tests/league.test.ts
git commit -m "refactor(league): make two-pass ELO rank assignment explicit in buildLeaderboard"
```

---

## Task 6: Discriminated union for `Match`

`Match` currently has `scoreA: number | null` and `scoreB: number | null`, forcing `!` non-null assertions throughout `elo.ts`. Scores are only null when a team forfeited; in all other cases they are guaranteed numbers. A discriminated union makes this invariant explicit and lets TypeScript eliminate the `!` assertions.

**Files:**

- Modify: `src/lib/types.ts`
- Modify: `src/lib/elo.ts`
- Modify: `src/lib/sheets.ts`
- Test: `src/tests/elo.test.ts` (no new tests; TypeScript compilation is the verification)
- Test: `src/tests/sheets.test.ts` (no new tests; TypeScript compilation is the verification)

**Interfaces:**

- Produces: `Match` is a union of `PlayedMatch | ForfeitedMatch`; downstream code that currently uses `match.scoreA!` gains type safety

- [ ] **Step 1: Replace `Match` with a discriminated union in `types.ts`**

In `src/lib/types.ts`, replace the `Match` interface with two named types:

```typescript
export interface PlayedMatch {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  forfeitA: false;
  forfeitB: false;
  weekIndex?: number;
}

export interface ForfeitedMatch {
  teamA: string;
  teamB: string;
  scoreA: null;
  scoreB: null;
  forfeitA: boolean;
  forfeitB: boolean;
  weekIndex?: number;
}

export type Match = PlayedMatch | ForfeitedMatch;
```

The discriminant is `forfeitA: false` on `PlayedMatch` — TypeScript uses the literal `false` to narrow: after guarding `if (match.forfeitA)` and `if (match.forfeitB)`, the compiler knows the remaining branch is `PlayedMatch` and `scoreA`/`scoreB` are `number`.

- [ ] **Step 2: Update `resolveMatchOutcome` in `elo.ts` to use narrowed types**

Replace `resolveMatchOutcome` in `src/lib/elo.ts`:

```typescript
function resolveMatchOutcome(
  match: Match,
  records: Records,
): { actualA: number; actualB: number; mult: number } {
  const { teamA, teamB } = match;

  if (match.forfeitA) {
    records[teamA].losses++;
    records[teamB].wins++;
    return { actualA: 0, actualB: 1, mult: 1.0 };
  }

  if (match.forfeitB) {
    records[teamA].wins++;
    records[teamB].losses++;
    return { actualA: 1, actualB: 0, mult: 1.0 };
  }

  // TypeScript now knows match is PlayedMatch: scoreA and scoreB are number
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

- [ ] **Step 3: Update `parseMatch` in `sheets.ts` to return the correct union member**

TypeScript infers object literal properties as their widened types by default. Use `as const` on the boolean literals to ensure the returned object matches `PlayedMatch` (where `forfeitA: false` is a literal, not `boolean`).

In `src/lib/sheets.ts`, update the two return statements in `parseMatch`:

The non-forfeit return (currently `return { teamA, teamB, scoreA, scoreB, forfeitA: false, forfeitB: false }`):

```typescript
return {
  teamA,
  teamB,
  scoreA,
  scoreB,
  forfeitA: false as const,
  forfeitB: false as const,
};
```

The forfeit return (currently `return { teamA, teamB, scoreA: null, scoreB: null, forfeitA, forfeitB }`):

```typescript
return { teamA, teamB, scoreA: null, scoreB: null, forfeitA, forfeitB };
```

(The forfeit return is unchanged — `forfeitA` and `forfeitB` are already `boolean` which matches `ForfeitedMatch`.)

- [ ] **Step 4: Run lint to catch type errors**

```bash
npm run lint
```

Expected: no TypeScript errors. The `!` assertions are now gone from `resolveMatchOutcome`.

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all tests pass. The test fixtures that use `{ forfeitA: false, forfeitB: false, scoreA: 21, scoreB: 14 }` already satisfy `PlayedMatch`. The forfeit fixtures already satisfy `ForfeitedMatch`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/elo.ts src/lib/sheets.ts
git commit -m "refactor(types): discriminated union for Match, eliminating null assertions in elo.ts"
```

---

## Task 7: Add missing test coverage and document fragile edge cases

Two gaps: (1) `marginMultiplier(x, x)` returns `0` (the log formula yields zero for margin=0), which would silently zero-out the K-factor for a tie; no test documents this. (2) `resolveUpcomingMatchups` has a comment-free heuristic that assumes blank-score rows are always unplayed; this fails silently when a week is partially played.

**Files:**

- Modify: `src/tests/elo.test.ts`
- Modify: `src/lib/league.ts`

- [ ] **Step 1: Add the margin=0 test to `elo.test.ts`**

In `src/tests/elo.test.ts`, inside `describe("marginMultiplier")`, add:

```typescript
it("returns 0 for a margin of 0 (log(1)/log(12) = 0), zeroing out K-factor for exact ties", () => {
  // scoreA === scoreB is handled before marginMultiplier is called in processMatches,
  // so this edge is unreachable in practice, but the formula is documented here.
  expect(marginMultiplier(10, 10)).toBe(0);
});
```

- [ ] **Step 2: Run the new test**

```bash
npx vitest run src/tests/elo.test.ts
```

Expected: PASS.

- [ ] **Step 3: Add an explanatory comment to `resolveUpcomingMatchups` in `league.ts`**

In `src/lib/league.ts`, find the `resolveUpcomingMatchups` function. Add a comment before the fallback loop explaining the heuristic and its assumption:

```typescript
function resolveUpcomingMatchups(
  rowsByTab: RowsByTab,
  config: LeaguePageConfig,
  weekRowsCache: string[][][],
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

  // Auto-detect: walk backward through weeks and return the first week that has
  // matchup rows with both team names present but blank scores (i.e. not yet played).
  // Assumes weeks are uploaded to the sheet before scores are entered — a partially
  // played week (some scores filled in, some blank) will still appear here but its
  // already-played games will be silently omitted. Set UPCOMING_TAB explicitly in
  // config.ts to avoid this ambiguity once a season is underway.
  for (let i = weekRowsCache.length - 1; i >= 0; i--) {
    const matchups = toUpcomingMatchups(
      weekRowsCache[i],
      ratings,
      canonicalNames,
    );
    if (matchups.length > 0) {
      return matchups;
    }
  }

  return [];
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tests/elo.test.ts src/lib/league.ts
git commit -m "test: document marginMultiplier(0) edge case; add comment explaining resolveUpcomingMatchups heuristic"
```

---

## Task 8: Minor cleanups

Four unrelated one-liners: rename misleading `game1`/`game2` variable names in `parseMatchupsWithCourts`; simplify `SHEET_ID` in `config.ts` by inlining it into `SHEET_URL`; add a comment to `parseCanonicalTeams` clarifying that row order is irrelevant; and add a `Promise`-based in-flight lock to the cache in `+page.server.ts` to prevent concurrent stampedes on a stale cache.

**Files:**

- Modify: `src/lib/sheets.ts`
- Modify: `src/lib/config.ts`
- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Rename `game1`/`game2` in `parseMatchupsWithCourts`**

In `src/lib/sheets.ts`, find `parseMatchupsWithCourts`. Rename `game1` → `leftMatchups` and `game2` → `rightMatchups` throughout the function:

```typescript
export function parseMatchupsWithCourts(rows: string[][]): MatchupWithCourt[] {
  const leftMatchups: MatchupWithCourt[] = [];
  const rightMatchups: MatchupWithCourt[] = [];
  for (const row of rows) {
    if (!row || row.length < 5) {
      continue;
    }
    const court = row[MATCHUP_COLS.COURT]?.trim() || null;
    const leftA = row[MATCHUP_COLS.LEFT_A]?.trim();
    const leftB = row[MATCHUP_COLS.LEFT_B]?.trim();
    if (leftA && leftB) {
      leftMatchups.push({ teamA: leftA, teamB: leftB, court });
    }
    const rightA = row[MATCHUP_COLS.RIGHT_A]?.trim();
    const rightB = row[MATCHUP_COLS.RIGHT_B]?.trim();
    if (rightA && rightB) {
      rightMatchups.push({ teamA: rightA, teamB: rightB, court });
    }
  }
  return [...leftMatchups, ...rightMatchups];
}
```

- [ ] **Step 2: Add a comment to `parseCanonicalTeams` in `sheets.ts`**

Above `parseCanonicalTeams`, add:

```typescript
// Returns canonical names in sheet row order; callers use these for lookup only,
// not positional indexing, so order does not matter.
export function parseCanonicalTeams(
  rows: string[][],
  nameCol: number,
): string[] {
```

- [ ] **Step 3: Inline `SHEET_ID` into `SHEET_URL` in `config.ts`**

`SHEET_ID` is a private constant used only to build `SHEET_URL` — it's redundant alongside the `PUBLIC_SHEET_ID` env var used for API calls. Replace:

```typescript
const SHEET_ID = "1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs";

// ... (keep the rest unchanged until SHEET_URL) ...

export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
```

With:

```typescript
export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs";
```

(The full `config.ts` file after this change is listed below for clarity.)

```typescript
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

// Set to a tab name to force it as "upcoming" (unplayed matchups).
// Set to null to auto-detect from the last week in WEEK_TABS.
export const UPCOMING_TAB: string | null = "Week 8";

// 0-indexed column in SUMMARY_TAB where canonical team names live.
// Confirmed from actual sheet: col0=blank, col1=RANKING, col2=blank, col3=TEAM
export const RANKINGS_NAME_COL = 3;
export const RANKINGS_RANK_COL = 1;

export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs";

export const MY_TEAM = "Walter and the Bocce Bunch";
```

- [ ] **Step 4: Add a Promise-based in-flight lock to the cache in `+page.server.ts`**

When the cache is stale and multiple requests arrive simultaneously, all of them currently race to call the Sheets API. Replace the module-level cache variables and `load` function with a version that serializes concurrent fetches via a shared `Promise`:

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
let inflight: Promise<PageData> | null = null;

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

  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
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
    } catch (err) {
      console.error("Failed to load league data:", err);
      if (!cached) {
        throw err;
      }
    }
    return cached!;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}
```

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sheets.ts src/lib/config.ts src/routes/+page.server.ts
git commit -m "chore: rename game1/game2, inline SHEET_ID, add comment to parseCanonicalTeams, fix cache stampede"
```

---

## Self-Review

**Spec coverage check:**

| Finding                                                           | Task   |
| ----------------------------------------------------------------- | ------ |
| Export `STARTING_RATING`, remove hardcoded `1000`                 | Task 1 |
| Remove `weeklyRatings` (computed, never read)                     | Task 1 |
| Remove `ScheduledMatch` unused type                               | Task 2 |
| Remove dead fallback in `buildLeaderboard` and `record.ties ?? 0` | Task 2 |
| Remove unused CSS vars `--surface-my-team`, `--border-my-team`    | Task 2 |
| Deduplicate `[data-theme="light"]` CSS block                      | Task 3 |
| Fix `hoverText` non-null assertion via `compareDiff`              | Task 4 |
| Remove `compareDiff` helper                                       | Task 4 |
| Clarify double-sort in `buildLeaderboard`                         | Task 5 |
| `Match` discriminated union, eliminate `!` assertions             | Task 6 |
| Add `marginMultiplier(0)` test                                    | Task 7 |
| Document `resolveUpcomingMatchups` heuristic                      | Task 7 |
| Rename `game1`/`game2` → `leftMatchups`/`rightMatchups`           | Task 8 |
| Add order comment to `parseCanonicalTeams`                        | Task 8 |
| Inline `SHEET_ID` into `SHEET_URL`                                | Task 8 |
| Cache stampede fix                                                | Task 8 |

All 16 findings covered. No placeholders found. Types and signatures are consistent across tasks — notably `ProcessMatchesResult` loses `weeklyRatings` in Task 1 (used only within `elo.ts`) and `Match` becomes a discriminated union in Task 6 (consumed by the already-updated `resolveMatchOutcome` from Task 1).
