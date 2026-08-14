# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev        # local dev server
pnpm run build      # production build
pnpm run test       # run all tests (vitest)
pnpm run lint       # prettier + eslint check
pnpm run format     # auto-format
pnpm run deploy     # build + deploy to Cloudflare Pages
```

Run a single test file: `pnpm exec vitest run src/tests/elo.test.ts`

## Architecture

SvelteKit app deployed to Cloudflare Pages (`@sveltejs/adapter-cloudflare`). There is one route (`/`). All data fetching happens in `src/routes/+page.server.ts`, which runs server-side on the edge. The compiled Svelte page in `+page.svelte` receives the data as props.

**Data flow:**
1. `+page.server.ts` → reads `config.ts` for tab names and column positions
2. Calls Google Sheets API v4 (public key, no OAuth) via `sheets.ts`
3. Parses match rows → normalizes team names via `names.ts`
4. Computes ELO ratings via `elo.ts`
5. Returns a `PageData` object to the Svelte page

**5-minute in-memory cache** with single-flight deduplication (concurrent stale requests share one fetch) is held in the server module scope (resets on redeploy).

## Key files

- **`src/routes/+page.server.ts`** — SvelteKit server load function. Fetches all required tabs, builds `PageData`, and manages a 5-minute in-memory cache with single-flight deduplication. Exports `__testing.expireCache()` for tests.
- **`src/lib/config.ts`** — Season configuration. Update `WEEK_TABS`, `UPCOMING_TAB`, `SEASON_LABEL`, `MY_TEAM`, and column constants each season.
- **`src/lib/names.ts`** — `ALIASES` map for truncated/misspelled team names from the sheet. `normalize()` strips punctuation/case; `canonicalize()` resolves to the official name.
- **`src/lib/sheets.ts`** — Google Sheets fetch + row parsing. Column layout is documented in a comment at the top. `parseMatch(row, colOffset)` handles both left (offset=1) and right (offset=6) match blocks per row.
- **`src/lib/elo.ts`** — ELO engine: starting rating 1000, K-factor 40, margin multiplier `Math.min(log(margin+1)/log(12), 2.0)` capped at 2.0. Forfeits (`"F"` in score cell) count as win/loss with multiplier 1.0.
- **`src/lib/types.ts`** — Shared TypeScript interfaces.

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
