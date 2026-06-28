# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build
npm run test       # run all tests (vitest)
npm run lint       # prettier + eslint check
npm run format     # auto-format
npm run deploy     # build + deploy to Cloudflare Pages
```

Run a single test file: `npx vitest run src/tests/elo.test.ts`

## Architecture

SvelteKit app deployed to Cloudflare Pages (`@sveltejs/adapter-cloudflare`). There is one route (`/`). All data fetching happens in `src/routes/+page.server.ts`, which runs server-side on the edge. The compiled Svelte page in `+page.svelte` receives the data as props.

**Data flow:**
1. `+page.server.ts` → reads `config.ts` for tab names and column positions
2. Calls Google Sheets API v4 (public key, no OAuth) via `sheets.ts`
3. Parses match rows → normalizes team names via `names.ts`
4. Computes ELO ratings via `elo.ts`
5. Returns a `PageData` object to the Svelte page

**5-minute in-memory cache** is held in the server module scope (resets on redeploy).

## Key files

- **`src/lib/config.ts`** — Season configuration. Update `WEEK_TABS`, `UPCOMING_TAB`, `SEASON_LABEL`, `MY_TEAM`, and column constants each season.
- **`src/lib/names.ts`** — `ALIASES` map for truncated/misspelled team names from the sheet. `normalize()` strips punctuation/case; `canonicalize()` resolves to the official name.
- **`src/lib/sheets.ts`** — Google Sheets fetch + row parsing. Column layout is documented in a comment at the top. `parseMatch(row, colOffset)` handles both left (offset=1) and right (offset=6) match blocks per row.
- **`src/lib/elo.ts`** — ELO engine: starting rating 1000, K-factor 40, margin multiplier `Math.min(log(margin+1)/log(12), 2.0)` capped at 2.0. Forfeits (`"F"` in score cell) count as win/loss with multiplier 1.0.
- **`src/lib/types.ts`** — Shared TypeScript interfaces.

## Env vars

```
PUBLIC_GOOGLE_API_KEY=...
PUBLIC_SHEET_ID=1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs
```

Both are `PUBLIC_` so they're embedded in the client bundle (the Sheet is publicly readable).

## Season updates

Each new season: update `config.ts` (new sheet ID if applicable, new tab names, `MY_TEAM`), and extend `ALIASES` in `names.ts` for any new truncated or misspelled team names found in the week tabs.

## Deployment

```bash
npm run deploy
# or equivalently:
npm run build && wrangler pages deploy .svelte-kit/cloudflare --project-name bocce-elo
```

Deployed at `bocce-elo.pages.dev` / `bocce.mrh.is`.
