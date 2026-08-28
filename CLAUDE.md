# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev            # local dev server
pnpm run build          # production build
pnpm run test           # run all tests (vitest)
pnpm run lint           # prettier + eslint check
pnpm run format         # auto-format
pnpm run deploy         # build + deploy to Cloudflare Pages
pnpm run check:upcoming # verify all teams have upcoming game data (needs .env)
```

Run a single test file: `pnpm exec vitest run src/tests/elo.test.ts`

## Architecture

SvelteKit app (Svelte 5 with runes) deployed to Cloudflare Pages (`@sveltejs/adapter-cloudflare`). Single route (`/`). All data fetching is server-side; the client receives pre-computed data as props and adds client-only interactivity (team selection, sorting).

**Data flow (server):**
1. `+page.server.ts` → reads `config.ts` for tab names and column positions
2. Calls Google Sheets API v4 (public key, no OAuth) via `sheets.ts`
3. Parses match rows → normalizes team names via `names.ts`
4. Computes ELO ratings via `elo.ts`
5. Orchestrates all of the above via `league.ts` → returns `PageData` to the page

**Client-side state:**
- Team selection: stored in `localStorage` key `"myTeam"`, read in `+page.svelte`, passed down as `myTeam` prop. Selected team is pinned to the top of the table and highlighted.
- Theme: stored in `localStorage` key `"theme"` by `ThemeSwitcher.svelte`. Applies `data-theme` attribute on `<html>`.
- Table sorting: local component state in `LeaderboardTable.svelte`. All columns are sortable; "This Week" sorts by court number.

**5-minute in-memory cache** with single-flight deduplication (concurrent stale requests share one fetch) is held in the server module scope (resets on redeploy).

## Key files

### Server / data layer

- **`src/routes/+page.server.ts`** — SvelteKit server load function. Fetches all required tabs, delegates to `league.ts`, manages a 5-minute in-memory cache with single-flight deduplication. Exports `__testing.expireCache()` for tests.
- **`src/lib/league.ts`** — Orchestration: takes raw `RowsByTab` + config, calls parsers/ELO engine, builds the final `PageData`. Contains `buildLeaguePageData()` and helpers for upcoming matchup resolution. The leaderboard is sorted by official rank by default; ELO rank is a separate field.
- **`src/lib/config.ts`** — Season configuration. Update `WEEK_TABS`, `UPCOMING_TAB`, `SEASON_LABEL`, `MY_TEAM`, and column constants each season.
- **`src/lib/names.ts`** — `ALIASES` map for truncated/misspelled team names from the sheet. `normalize()` strips punctuation/case; `canonicalize()` resolves to the official name, with a prefix-matching fallback for arbitrary truncations (8+ chars, unique match required).
- **`src/lib/sheets.ts`** — Google Sheets fetch + row parsing. Column layout is documented in a comment at the top. `parseMatch(row, colOffset)` handles both left (offset=1) and right (offset=6) match blocks per row. `parseMatchupsWithCourts()` extracts upcoming matchups with court numbers.
- **`src/lib/elo.ts`** — ELO engine: starting rating 1000, K-factor 40, margin multiplier `Math.min(log(margin+1)/log(12), 2.0)` capped at 2.0. Forfeits (`"F"` in score cell) count as win/loss with multiplier 1.0.
- **`src/lib/types.ts`** — Shared TypeScript interfaces (`LeaderboardEntry`, `PageData`, `Match`, `UpcomingGame`, etc.).

### UI components (`src/lib/components/`)

- **`LeaderboardTable.svelte`** — Main data table. Accepts `entries`, `hasUpcoming`, `myTeam`, `emptyMessage`. Handles column sorting (clickable headers with ▲/▼ indicators) and pins the selected team to the top. Column order: Off, Team, This Week, ELO, Rank, W, L, T.
- **`TeamRow.svelte`** — Single table row. Accepts `team` (LeaderboardEntry), `hasUpcoming`, `isMyTeam`. Shows medals for top 3 official rank, color-coded ELO rank diff, shimmer highlight for user's team.
- **`TeamPicker.svelte`** — Dropdown for selecting "your team". Accepts `teams` (sorted name list), `selected`, `onSelect` callback. Styled to match the search bar.
- **`SearchBar.svelte`** — Text input that filters the leaderboard by team name.
- **`GameLine.svelte`** — Single upcoming game row inside the "This Week" cell: court number, opponent, win probability badge.
- **`UpcomingGames.svelte`** — Renders a list of `GameLine` components (or a dash if none).
- **`PageHeader.svelte`** — Title, season label, info button, theme switcher.
- **`InfoModal.svelte`** — Explanation modal (how ELO works, data source link, last updated time).
- **`ThemeSwitcher.svelte`** — Light/dark/system toggle using `localStorage` + `data-theme` attribute.
- **`BocceBackground.svelte`** — Decorative bocce ball shapes around the page edges (CSS only, no JS).
- **`ExternalLink.svelte`**, **`RelativeTime.svelte`**, **`Footer.svelte`** — Small utility components.

### Styles

- **`src/app.css`** — CSS custom properties for light/dark themes, base layout. The `.layout` class creates a full-height flex column. `overscroll-behavior-x: none` prevents horizontal bounce.

### Tests (`src/tests/`)

- `elo.test.ts` — ELO computation, margin multipliers, forfeits, ties
- `names.test.ts` — Normalization, alias resolution, prefix matching
- `sheets.test.ts` — Match parsing, matchup parsing, score edge cases
- `league.test.ts` — End-to-end `buildLeaguePageData` with mock sheet data
- `page-server.test.ts` — Cache behavior, load function

### Google Sheet layout

Each week tab has this column structure (0-indexed):
```
| 0:blank | 1:court | 2:teamA | 3:scoreA | 4:teamB | 5:scoreB | 6:blank | 7:teamA2 | 8:scoreA2 | 9:teamB2 | 10:scoreB2 |
```
Each row = one court, with two match blocks (left cols 1-5, right cols 6-10). Both matches on the same row share the court number from column 1. The Standings tab has: `col0=blank, col1=RANKING, col2=blank, col3=TEAM`.

## Env vars

```
PUBLIC_GOOGLE_API_KEY=...
PUBLIC_SHEET_ID=1Vb_iXA83NK33Jvl5lSr9jNoQTelFlIhBnac5KjjkiDI
```

Both are `PUBLIC_` so they're embedded in the client bundle (the Sheet is publicly readable).

## Season updates

Each new season: update `config.ts` (new sheet ID if applicable, new tab names, `MY_TEAM`), and extend `ALIASES` in `names.ts` for any new truncated or misspelled team names found in the week tabs.

## Implementation plans

Specs and implementation plans live in `docs/superpowers/plans/`. Commit them alongside the code they describe — they serve as the design record for non-obvious decisions. Don't delete them after the work is done.

## Deployment

```bash
pnpm run deploy
# or equivalently:
pnpm run build && wrangler pages deploy .svelte-kit/cloudflare --project-name bocce-elo
```

Deployed at `bocce-elo.pages.dev` / `bocce.mrh.is`.
