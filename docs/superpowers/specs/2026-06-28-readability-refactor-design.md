# Readability Refactor Design

**Date:** 2026-06-28
**Goal:** Make the codebase understandable to a junior developer on a quick scan. Achieve this through structure and naming — not prose — except for one well-placed layout diagram in `sheets.ts`.

---

## 1. `elo.ts`

Extract two helpers from the body of `processMatches` so the main loop reads as a high-level narrative.

### `trackWeekAppearance(weekAppearances, weekIndex, team)`

Encapsulates the week-appearance map init, increment, and `console.warn` for one team in one week. Currently ~10 inline lines; called twice per match (once per team).

```ts
function trackWeekAppearance(
  weekAppearances: Record<number, Record<string, number>>,
  weekIndex: number,
  team: string,
): void
```

### `resolveMatchOutcome(match, records)`

Contains the three-branch decision (forfeit A / forfeit B / tie or win). Mutates `records` in place for both teams; returns `{ actualA, actualB, mult }` for use in the rating update.

```ts
function resolveMatchOutcome(
  match: Match,
  records: Records,
): { actualA: number; actualB: number; mult: number }
```

### Result

After extraction, `processMatches` body reads as:
1. Init state objects
2. For each match: init teams → track appearances → compute expected scores → resolve outcome → update ratings → push history
3. Return `{ ratings, records, weeklyRatings }`

Each step is one readable line or a short call. No logic lives inline in the loop.

---

## 2. `sheets.ts`

Two targeted changes. No new functions; no restructuring of existing ones.

### Column-layout diagram

A single comment block at the top of the file (below imports) diagrams the physical spreadsheet row layout that both the match parser and the matchup parser share. This is the one thing a new dev cannot infer from the code alone.

```
// Spreadsheet row layout (0-indexed columns):
// | 0:blank | 1:court | 2:teamA | 3:scoreA | 4:teamB | 5:scoreB | 6:blank | 7:teamA2 | 8:scoreA2 | 9:teamB2 | 10:scoreB2 |
//
// Left match block  = cols 1–5  → parseMatch(row, colOffset=1)
// Right match block = cols 6–10 → parseMatch(row, colOffset=6)
```

### Named column constants

Replace magic number offsets with two named objects:

```ts
const MATCH_COLS  = { COURT: 0, TEAM_A: 1, SCORE_A: 2, TEAM_B: 3, SCORE_B: 4 } as const;
const MATCHUP_COLS = { COURT: 1, LEFT_A: 2, LEFT_B: 4, RIGHT_A: 7, RIGHT_B: 9 } as const;
```

Internal accesses in `parseMatch`, `parseScheduledMatch`, and `parseMatchupsWithCourts` become `row[colOffset + MATCH_COLS.TEAM_A]`, `row[MATCHUP_COLS.LEFT_A]`, etc. The `colOffset` parameter on `parseMatch` and `parseScheduledMatch` is unchanged.

---

## 3. `+page.server.ts`

Extract four named functions so `load()` becomes a short orchestrator. All functions live in the same file.

### Extracted functions

| Function | Returns | Notes |
|---|---|---|
| `fetchLeagueData(sheetId, apiKey)` | `{ canonicalNames, officialRankings }` | Swallows errors with `console.warn` for each fetch |
| `fetchAllMatches(sheetId, apiKey, weekTabs, canonicalNames)` | `{ allMatches, weekRowsCache }` | Canonicalizes team names; preserves row cache for upcoming resolution |
| `resolveUpcoming(weekRowsCache, sheetId, apiKey, ratings, canonicalNames)` | `UpcomingMatchup[]` | Handles UPCOMING_TAB branch vs. backwards-scan branch; probabilities computed here |
| `buildLeaderboard(ratings, records, officialRankings, upcomingByTeam)` | `LeaderboardEntry[]` | Pure function; produces sorted leaderboard array |

A fifth helper `buildUpcomingIndex(upcomingMatches)` extracts the `upcomingByTeam` map construction (currently ~10 inline lines).

### Resulting `load()` shape

```ts
export async function load(): Promise<PageData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  const { canonicalNames, officialRankings } = await fetchLeagueData(PUBLIC_SHEET_ID, PUBLIC_GOOGLE_API_KEY);
  const { allMatches, weekRowsCache } = await fetchAllMatches(PUBLIC_SHEET_ID, PUBLIC_GOOGLE_API_KEY, WEEK_TABS, canonicalNames);
  const { ratings, records } = processMatches(allMatches);
  const upcomingMatches = await resolveUpcoming(weekRowsCache, PUBLIC_SHEET_ID, PUBLIC_GOOGLE_API_KEY, ratings, canonicalNames);
  const upcomingByTeam = buildUpcomingIndex(upcomingMatches);
  const leaderboard = buildLeaderboard(ratings, records, officialRankings, upcomingByTeam);

  cached = { leaderboard, seasonLabel: SEASON_LABEL, lastUpdated: new Date().toISOString(), sheetUrl: SHEET_URL, myTeam: MY_TEAM };
  cachedAt = Date.now();
  return cached;
}
```

Cache logic and return are unchanged.

---

## 4. `+page.svelte` component split

### New files

All components go in `src/lib/components/`. Each carries its own scoped `<style>` block (Svelte idiom — components are self-contained).

| File | Props | Responsibility |
|---|---|---|
| `PageHeader.svelte` | `seasonLabel: string` | Decorative diamonds, h1, season label |
| `SearchBar.svelte` | `value: string` (bindable) | Search input with label |
| `GameLine.svelte` | `court: string \| null`, `opponent: string`, `prob: number` | One game row: court + opponent + probability chip |
| `UpcomingGames.svelte` | `games: UpcomingGame[]` | Full "This Week" cell content; renders `GameLine` per entry, `–` if empty |
| `TeamRow.svelte` | `team: LeaderboardEntry`, `hasUpcoming: boolean` | One `<tr>`; contains `rankDiffClass` logic |
| `LeaderboardTable.svelte` | `entries: LeaderboardEntry[]`, `hasUpcoming: boolean` | `<table>` with sticky `<thead>` and `<tbody>` iterating `TeamRow` |

### Global CSS → `src/app.css` + `src/routes/+layout.svelte`

No `+layout.svelte` exists yet. Create both:

1. `src/app.css` — the truly global styles extracted from `+page.svelte`:
   - `:global(*) { box-sizing: border-box }`
   - `:global(body)` — background, font, height, overflow
   - `.layout` — full-height flex container, max-width, padding
   - `@media (max-width: 600px)` — mobile scroll overrides

2. `src/routes/+layout.svelte` — minimal SvelteKit layout that imports the CSS:
   ```svelte
   <script>
     import '../app.css';
     const { children } = $props();
   </script>
   {@render children()}
   ```

### Resulting `+page.svelte`

Script block: `data` prop, `search` state, `filtered` derived, `hasUpcoming` derived (~10 lines).  
Template: `<PageHeader>` + `<SearchBar>` + `<LeaderboardTable>` + footer (footer is two text lines, stays inline).  
Style block: `.layout` scoped styles only, if any remain; otherwise empty and removed.

---

## Out of scope

- `src/lib/names.ts` — already clean and well-commented; no changes
- `src/lib/config.ts` — already flat constants; no changes
- `src/lib/types.ts` — already clean; no changes
- Test files — no changes (tests exercise behavior, not structure)
- New modules — no new files beyond components; helpers stay in their originating file
