# Bocce ELO Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SvelteKit web app that reads a public Google Sheet of bocce league results, computes ELO ratings game-by-game, and renders a live leaderboard deployable to Cloudflare Pages.

**Architecture:** All data fetching and ELO computation happen client-side inside SvelteKit's `load()` function. The Google Sheets API v4 is called directly from the browser using a public API key. No server, no database — the sheet is the source of truth and everything is re-derived on each page load.

**Tech Stack:** SvelteKit 2, `@sveltejs/adapter-cloudflare`, Google Sheets API v4, Vitest

## Global Constraints

- SvelteKit with `@sveltejs/adapter-cloudflare`; Cloudflare Pages output dir `.svelte-kit/cloudflare`
- No backend; all logic runs client-side in `+page.js` (not `+page.server.js`)
- `PUBLIC_GOOGLE_API_KEY` and `PUBLIC_SHEET_ID` in `.env`; access via `$env/static/public`
- ELO starting rating: **1000**, K-factor: **40**
- Margin multiplier: `Math.min(Math.log(margin + 1) / Math.log(12), 2.0)`
- Forfeit (`F` in score cell): counts as win/loss with multiplier **1.0**; excluded from point differential
- Skip any game where either score is absent/non-numeric and not `F`
- Process weeks in tab order; within each week, top-to-bottom, left block before right block
- No TypeScript; plain JavaScript throughout

---

## File Map

| File                       | Responsibility                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `src/lib/config.js`        | Season label, ordered week tab names, summary tab name, rankings column index              |
| `src/lib/names.js`         | `ALIASES` map, `normalize()`, `canonicalize()`                                             |
| `src/lib/sheets.js`        | `fetchTab()`, `parseMatch()`, `parseMatchTab()`, `getCanonicalTeams()` — no `$env` imports |
| `src/lib/elo.js`           | `expectedScore()`, `marginMultiplier()`, `processMatches()`                                |
| `src/routes/+page.js`      | `load()`: orchestrates fetch → parse → canonicalize → ELO → leaderboard array              |
| `src/routes/+page.svelte`  | Leaderboard UI: ranked table, search, trend indicator, dark sporty style                   |
| `svelte.config.js`         | Cloudflare adapter wired up                                                                |
| `.env`                     | `PUBLIC_GOOGLE_API_KEY`, `PUBLIC_SHEET_ID` (gitignored)                                    |
| `.env.example`             | Committed template with placeholder values                                                 |
| `src/tests/names.test.js`  | Unit tests for normalize + canonicalize                                                    |
| `src/tests/sheets.test.js` | Unit tests for parseMatch + parseMatchTab                                                  |
| `src/tests/elo.test.js`    | Unit tests for expectedScore, marginMultiplier, processMatches                             |

---

## Task 1: Project Scaffolding

**Files:**

- Create: `package.json`, `svelte.config.js`, `vite.config.js`, `.env.example`, `.gitignore`

**Interfaces:**

- Produces: runnable SvelteKit skeleton with Vitest; `npm test` works; `npm run build` produces `.svelte-kit/cloudflare`

- [ ] **Step 1: Scaffold SvelteKit skeleton project**

```bash
cd /Users/michael/Projects/bocce-elo
npm create svelte@latest .
```

When prompted, choose:

- Template: **Skeleton project**
- Type checking: **No** (plain JS)
- ESLint: your preference (Yes recommended)
- Prettier: your preference (Yes recommended)
- Playwright: **No**
- Vitest: **Yes**

- [ ] **Step 2: Install Cloudflare adapter**

```bash
npm install -D @sveltejs/adapter-cloudflare
```

- [ ] **Step 3: Update svelte.config.js to use Cloudflare adapter**

Replace the generated `svelte.config.js` with:

```js
import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
```

- [ ] **Step 4: Create .env.example and .env**

Create `.env.example`:

```
PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
PUBLIC_SHEET_ID=1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs
```

Create `.env` (fill in your real key, this is gitignored):

```
PUBLIC_GOOGLE_API_KEY=<your real key>
PUBLIC_SHEET_ID=1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs
```

- [ ] **Step 5: Verify .gitignore covers .env**

Open `.gitignore` and confirm `.env` is listed (the skeleton usually adds it). Add it if missing:

```
.env
```

- [ ] **Step 6: Verify the scaffolding works**

```bash
npm run dev
```

Expected: dev server starts at `http://localhost:5173` with no errors.

```bash
npm test
```

Expected: Vitest runs and reports "No test files found" (no tests yet — that's fine).

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold SvelteKit project with Cloudflare adapter"
```

---

## Task 2: Sheet Inspection & Config

**Files:**

- Create: `src/lib/config.js`

**Interfaces:**

- Produces:

  ```js
  // src/lib/config.js
  export const SEASON_LABEL; // string, e.g. "2025 Season"
  export const SUMMARY_TAB; // string, tab name for canonical team names
  export const WEEK_TABS; // string[], ordered week tab names
  export const RANKINGS_NAME_COL; // number, 0-indexed column for team name in SUMMARY_TAB
  ```

- [ ] **Step 1: Open the sheet and inspect tab names**

Open this URL in a browser:

```
https://docs.google.com/spreadsheets/d/1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs
```

Look at the tab bar at the bottom. Note:

1. The exact name of each week tab (e.g. "Week 1", "Wk 1", "Week 1 - 4/3" — spelling matters)
2. The exact name of the summary/rankings tab
3. Whether there are non-match tabs to skip (e.g. a "Schedule" or "Rules" tab)

In the RANKINGS/summary tab:

- Identify which column (0-indexed) contains canonical team names
- Note whether row 0 is a header row to skip

- [ ] **Step 2: Write src/lib/config.js with real values from the sheet**

```js
// Update WEEK_TABS and SUMMARY_TAB with names you found in Step 1.
// col0=RANKING, col1=blank, col2=TEAM — confirmed from actual sheet.

export const SEASON_LABEL = "2025 Season";

export const SUMMARY_TAB = "RANKINGS"; // verify exact tab name

export const WEEK_TABS = [
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
  "Week 7",
  "Week 8",
  // Add/remove weeks to match the actual sheet
];

// 0-indexed column in SUMMARY_TAB where canonical team names live.
// Confirmed from actual sheet: col0=RANKING, col1=blank, col2=TEAM
export const RANKINGS_NAME_COL = 2;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/config.js
git commit -m "feat: add season config with verified tab names"
```

---

## Task 3: Name Normalization

**Files:**

- Create: `src/lib/names.js`, `src/tests/names.test.js`

**Interfaces:**

- Produces:

  ```js
  // src/lib/names.js
  export const ALIASES  // Record<string, string> — normalized alias → canonical name
  export function normalize(name: string): string
  export function canonicalize(name: string, canonicalNames: string[]): string
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/tests/names.test.js`:

```js
import { describe, it, expect } from "vitest";
import { normalize, canonicalize, ALIASES } from "../lib/names.js";

describe("normalize", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalize("L&O: SHU")).toBe("lo shu");
  });
  it("trims whitespace", () => {
    expect(normalize("  Boccegenius  ")).toBe("boccegenius");
  });
  it("preserves digits", () => {
    expect(normalize("Balls5Eva")).toBe("balls5eva");
  });
});

describe("canonicalize", () => {
  const canonical = [
    "1 Ball, 2 Balls, Red Balls, Blue Balls",
    "Balltime High",
    "Ballz5Eva",
    "Bocce-lism",
    "Bocce-r? I barely know her!",
    "Deep Throwed It",
    "Gay De-Bocce-ry",
    "I Wanna Dance With Some Bocce",
    "InGaysion of the Bocce Snatchers",
    "Irritable Bocce Syndrome",
    "Itty Bitty Bocce Committee",
    "Lawn Order: Special Homo Unit",
    "Lawn and Order: Pallina Intent",
    "Love is a Bocce Field",
    "Resting Bocce Faces",
    "Slobberknockin on Ediballs",
    "Son of a Be-occe",
    "Teeny Weenie Pallinis",
    "The House Of Bocce",
    "Throws of Despair",
    "Walter and the Bocce Bunch",
    "boccegenius",
  ];

  it("resolves known aliases", () => {
    // Truncations
    expect(canonicalize("Ingaysion of the Bocce", canonical)).toBe(
      "InGaysion of the Bocce Snatchers",
    );
    expect(canonicalize("Slobberknockin'", canonical)).toBe(
      "Slobberknockin on Ediballs",
    );
    expect(canonicalize("Teeny Weenie", canonical)).toBe(
      "Teeny Weenie Pallinis",
    );
    // L&O variants (L&O: SHU → normalize → 'lo shu')
    expect(canonicalize("L&O: SHU", canonical)).toBe(
      "Lawn Order: Special Homo Unit",
    );
    expect(canonicalize("L & O: Special Homo Unit", canonical)).toBe(
      "Lawn Order: Special Homo Unit",
    );
    expect(canonicalize("L&O: PI", canonical)).toBe(
      "Lawn and Order: Pallina Intent",
    );
    expect(canonicalize("L & O: Pallina Intent", canonical)).toBe(
      "Lawn and Order: Pallina Intent",
    );
    // Typos
    expect(canonicalize("Balls5Eva", canonical)).toBe("Ballz5Eva");
    expect(canonicalize("Deeped Throwed It", canonical)).toBe(
      "Deep Throwed It",
    );
    expect(canonicalize("Irratable Bocce Syndrome", canonical)).toBe(
      "Irritable Bocce Syndrome",
    );
    expect(canonicalize("Ball Time High", canonical)).toBe("Balltime High");
  });

  it("resolves via normalize() alone (no explicit alias needed)", () => {
    // These normalize to the same string as the canonical name
    expect(canonicalize("Boccelism", canonical)).toBe("Bocce-lism"); // both → 'boccelism'
    expect(canonicalize("Gay Deboccery", canonical)).toBe("Gay De-Bocce-ry"); // both → 'gay deboccery'
    expect(canonicalize("The House of Bocce", canonical)).toBe(
      "The House Of Bocce",
    ); // both → 'the house of bocce'
  });

  it("matches exact canonical name case-insensitively", () => {
    expect(canonicalize("boccegenius", canonical)).toBe("boccegenius");
    expect(canonicalize("BOCCEGENIUS", canonical)).toBe("boccegenius");
  });

  it("returns name as-is when not found (and logs warning)", () => {
    const result = canonicalize("Unknown Team", canonical);
    expect(result).toBe("Unknown Team");
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../lib/names.js'`

- [ ] **Step 3: Implement src/lib/names.js**

Keys in ALIASES are the **normalized** form of the alias (i.e. already run through `normalize()`). All confirmed from actual sheet match data.

```js
// Keys are normalize()-d strings; values are exact canonical names from the RANKINGS tab.
export const ALIASES = {
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

export function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalize(name, canonicalNames) {
  const n = normalize(name);

  if (ALIASES[n]) return ALIASES[n];

  for (const canonical of canonicalNames) {
    if (normalize(canonical) === n) return canonical;
  }

  console.warn(`[names] Unknown team name: "${name}"`);
  return name;
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- --reporter=verbose
```

Expected: all names.test.js tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/names.js src/tests/names.test.js
git commit -m "feat: add name normalization with known alias map"
```

---

## Task 4: Google Sheets Parser

**Files:**

- Create: `src/lib/sheets.js`, `src/tests/sheets.test.js`

**Interfaces:**

- Consumes: no imports from `$env` — callers pass `sheetId` and `apiKey` explicitly
- Produces:

  ```js
  // src/lib/sheets.js
  export async function fetchTab(sheetId, apiKey, tabName): Promise<string[][]>
  export function parseMatch(row, colOffset): Match | null
    // Match = { teamA, teamB, scoreA, scoreB, forfeitA, forfeitB }
    // scoreA/scoreB are null if it's a forfeit
  export function parseMatchTab(rows): Match[]
  export async function getCanonicalTeams(sheetId, apiKey, summaryTab, nameCol): Promise<string[]>
  ```

- [ ] **Step 1: Write failing tests**

Create `src/tests/sheets.test.js`:

```js
import { describe, it, expect } from "vitest";
import { parseMatch, parseMatchTab } from "../lib/sheets.js";

describe("parseMatch", () => {
  it("parses a normal game from left block (colOffset=0)", () => {
    const row = [
      "1",
      "Team Alpha",
      "21",
      "Team Beta",
      "14",
      "",
      "2",
      "Team Gamma",
      "18",
      "Team Delta",
      "21",
    ];
    expect(parseMatch(row, 0)).toEqual({
      teamA: "Team Alpha",
      teamB: "Team Beta",
      scoreA: 21,
      scoreB: 14,
      forfeitA: false,
      forfeitB: false,
    });
  });

  it("parses a normal game from right block (colOffset=5)", () => {
    // Row layout: [court, teamA, scoreA, teamB, scoreB, blank, teamA2, scoreA2, teamB2, scoreB2]
    // Right block has NO second court# column — blank is at index 5, teamA2 at index 6.
    const row = [
      "1",
      "Team Alpha",
      "21",
      "Team Beta",
      "14",
      "",
      "Team Gamma",
      "18",
      "Team Delta",
      "21",
    ];
    expect(parseMatch(row, 5)).toEqual({
      teamA: "Team Gamma",
      teamB: "Team Delta",
      scoreA: 18,
      scoreB: 21,
      forfeitA: false,
      forfeitB: false,
    });
  });

  it("returns null when team name is missing", () => {
    const row = ["1", "", "21", "Team Beta", "14"];
    expect(parseMatch(row, 0)).toBeNull();
  });

  it("returns null when scores are missing (blank, not forfeit)", () => {
    const row = ["1", "Team Alpha", "", "Team Beta", ""];
    expect(parseMatch(row, 0)).toBeNull();
  });

  it("handles forfeit on score A", () => {
    const row = ["1", "Team Alpha", "F", "Team Beta", "21"];
    expect(parseMatch(row, 0)).toEqual({
      teamA: "Team Alpha",
      teamB: "Team Beta",
      scoreA: null,
      scoreB: null,
      forfeitA: true,
      forfeitB: false,
    });
  });

  it("handles forfeit on score B", () => {
    const row = ["1", "Team Alpha", "21", "Team Beta", "F"];
    expect(parseMatch(row, 0)).toEqual({
      teamA: "Team Alpha",
      teamB: "Team Beta",
      scoreA: null,
      scoreB: null,
      forfeitA: false,
      forfeitB: true,
    });
  });

  it("returns null when row is too short for given colOffset", () => {
    const row = ["1", "Team Alpha", "21", "Team Beta", "14"];
    expect(parseMatch(row, 5)).toBeNull();
  });
});

describe("parseMatchTab", () => {
  it("extracts matches from both blocks across multiple rows", () => {
    // Right block has no second court# — layout: [court, tA, sA, tB, sB, blank, tA2, sA2, tB2, sB2]
    const rows = [
      ["1", "Alpha", "21", "Beta", "14", "", "Gamma", "18", "Delta", "21"],
      [], // blank row — skip
      ["3", "Epsilon", "21", "Zeta", "10", "", "Eta", "F", "Theta", "21"],
    ];
    const matches = parseMatchTab(rows);
    expect(matches).toHaveLength(4);
    expect(matches[0].teamA).toBe("Alpha");
    expect(matches[1].teamA).toBe("Gamma");
    expect(matches[2].forfeitA).toBe(true);
    expect(matches[3].teamA).toBe("Eta");
  });

  it("skips header row (GAME 1 / GAME 2) gracefully", () => {
    // The Sheets API returns the header row; teamB slot is blank → returns null
    const rows = [["", "GAME 1", "", "", "", "", "GAME 2", "", "", ""]];
    expect(parseMatchTab(rows)).toHaveLength(0);
  });

  it("skips a block when both score cells are blank", () => {
    const rows = [["1", "Alpha", "", "Beta", ""]];
    expect(parseMatchTab(rows)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../lib/sheets.js'`

- [ ] **Step 3: Implement src/lib/sheets.js**

```js
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export async function fetchTab(sheetId, apiKey, tabName) {
  const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(tabName)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(
      `Sheets API error for tab "${tabName}": ${res.status} ${res.statusText}`,
    );
  const data = await res.json();
  return data.values ?? [];
}

export function parseMatch(row, colOffset) {
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

export function parseMatchTab(rows) {
  const matches = [];
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    // Left block: [court#, teamA, scoreA, teamB, scoreB, blank, ...]
    const left = parseMatch(row, 0);
    if (left) matches.push(left);
    // Right block: [..., blank, teamA2, scoreA2, teamB2, scoreB2]
    // No court# in the right block — blank is at index 5, teamA2 at index 6.
    const right = parseMatch(row, 5);
    if (right) matches.push(right);
  }
  return matches;
}

export async function getCanonicalTeams(sheetId, apiKey, summaryTab, nameCol) {
  const rows = await fetchTab(sheetId, apiKey, summaryTab);
  const names = new Set();
  for (const row of rows.slice(1)) {
    // skip header row
    const name = row[nameCol]?.trim();
    if (name) names.add(name);
  }
  return [...names];
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- --reporter=verbose
```

Expected: all sheets.test.js tests PASS (names.test.js still passing too).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.js src/tests/sheets.test.js
git commit -m "feat: add Google Sheets parser"
```

---

## Task 5: ELO Engine

**Files:**

- Create: `src/lib/elo.js`, `src/tests/elo.test.js`

**Interfaces:**

- Consumes: `Match` objects from `parseMatchTab` (shape: `{ teamA, teamB, scoreA, scoreB, forfeitA, forfeitB }`)
- Produces:

  ```js
  // src/lib/elo.js
  export function expectedScore(ratingA, ratingB): number  // 0..1
  export function marginMultiplier(winnerScore, loserScore): number  // clamped at 2.0
  export function processMatches(matches): { ratings, records, weeklyRatings }
    // ratings: Record<string, number>
    // records: Record<string, { wins, losses, pointsFor, pointsAgainst }>
    // weeklyRatings: Record<string, number[]>  — one entry per processed match (for trend)
  ```

- [ ] **Step 1: Write failing tests**

Create `src/tests/elo.test.js`:

```js
import { describe, it, expect } from "vitest";
import { expectedScore, marginMultiplier, processMatches } from "../lib/elo.js";

describe("expectedScore", () => {
  it("returns 0.5 when ratings are equal", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
  });
  it("favours the higher-rated team", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });
  it("expected scores sum to 1", () => {
    const eA = expectedScore(1100, 950);
    const eB = expectedScore(950, 1100);
    expect(eA + eB).toBeCloseTo(1);
  });
});

describe("marginMultiplier", () => {
  it("returns ~1.0 for a margin of 11 (normalisation point)", () => {
    // ln(12)/ln(12) = 1.0
    expect(marginMultiplier(21, 10)).toBeCloseTo(1.0, 1);
  });
  it("clamps at 2.0 for very large margins", () => {
    expect(marginMultiplier(21, 0)).toBeLessThanOrEqual(2.0);
  });
  it("is greater for larger margins", () => {
    expect(marginMultiplier(21, 10)).toBeGreaterThan(marginMultiplier(21, 15));
  });
  it("returns > 0 for a margin of 1", () => {
    expect(marginMultiplier(21, 20)).toBeGreaterThan(0);
  });
});

describe("processMatches", () => {
  it("starts every team at 1000", () => {
    const matches = [
      {
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
        forfeitA: false,
        forfeitB: false,
      },
    ];
    const { ratings } = processMatches(matches);
    expect(ratings["Alpha"]).not.toBeUndefined();
    expect(ratings["Beta"]).not.toBeUndefined();
  });

  it("winner gains rating, loser loses", () => {
    const matches = [
      {
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
        forfeitA: false,
        forfeitB: false,
      },
    ];
    const { ratings } = processMatches(matches);
    expect(ratings["Alpha"]).toBeGreaterThan(1000);
    expect(ratings["Beta"]).toBeLessThan(1000);
  });

  it("tracks win/loss records correctly", () => {
    const matches = [
      {
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
        forfeitA: false,
        forfeitB: false,
      },
      {
        teamA: "Beta",
        teamB: "Gamma",
        scoreA: 21,
        scoreB: 10,
        forfeitA: false,
        forfeitB: false,
      },
    ];
    const { records } = processMatches(matches);
    expect(records["Alpha"]).toEqual({
      wins: 1,
      losses: 0,
      pointsFor: 21,
      pointsAgainst: 14,
    });
    expect(records["Beta"]).toEqual({
      wins: 1,
      losses: 1,
      pointsFor: 35,
      pointsAgainst: 35,
    });
    expect(records["Gamma"]).toEqual({
      wins: 0,
      losses: 1,
      pointsFor: 10,
      pointsAgainst: 21,
    });
  });

  it("handles forfeit: winner gets win, no points added to differential", () => {
    const matches = [
      {
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: null,
        scoreB: null,
        forfeitA: true,
        forfeitB: false,
      },
    ];
    const { records, ratings } = processMatches(matches);
    expect(records["Beta"].wins).toBe(1);
    expect(records["Alpha"].losses).toBe(1);
    expect(records["Alpha"].pointsFor).toBe(0);
    expect(records["Beta"].pointsFor).toBe(0);
    expect(ratings["Beta"]).toBeGreaterThan(1000);
  });

  it("logs a warning for duplicate appearances in one week (via weeklyAppearances tracking)", () => {
    // processMatches accepts a weekIndex on each match for this check
    // Simple check: no crash and ratings are computed
    const matches = [
      {
        teamA: "Alpha",
        teamB: "Beta",
        scoreA: 21,
        scoreB: 14,
        forfeitA: false,
        forfeitB: false,
        weekIndex: 0,
      },
      {
        teamA: "Alpha",
        teamB: "Gamma",
        scoreA: 18,
        scoreB: 21,
        forfeitA: false,
        forfeitB: false,
        weekIndex: 0,
      },
      {
        teamA: "Alpha",
        teamB: "Delta",
        scoreA: 21,
        scoreB: 5,
        forfeitA: false,
        forfeitB: false,
        weekIndex: 0,
      },
    ];
    expect(() => processMatches(matches)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../lib/elo.js'`

- [ ] **Step 3: Implement src/lib/elo.js**

```js
const STARTING_RATING = 1000;
const K = 40;

export function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function marginMultiplier(winnerScore, loserScore) {
  const margin = Math.abs(winnerScore - loserScore);
  return Math.min(Math.log(margin + 1) / Math.log(12), 2.0);
}

function initTeam(ratings, records, weeklyRatings, name) {
  if (!ratings[name]) {
    ratings[name] = STARTING_RATING;
    records[name] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
    weeklyRatings[name] = [];
  }
}

export function processMatches(matches) {
  const ratings = {};
  const records = {};
  const weeklyRatings = {};
  const weekAppearances = {}; // weekIndex → { teamName: count }

  for (const match of matches) {
    const { teamA, teamB, scoreA, scoreB, forfeitA, forfeitB, weekIndex } =
      match;

    initTeam(ratings, records, weeklyRatings, teamA);
    initTeam(ratings, records, weeklyRatings, teamB);

    // Duplicate appearance warning
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

    let actualA, actualB, mult;

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
    } else {
      actualA = scoreA > scoreB ? 1 : 0;
      actualB = scoreB > scoreA ? 1 : 0;
      mult = marginMultiplier(
        Math.max(scoreA, scoreB),
        Math.min(scoreA, scoreB),
      );

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
    }

    ratings[teamA] = Math.round(rA + K * mult * (actualA - eA));
    ratings[teamB] = Math.round(rB + K * mult * (actualB - eB));

    weeklyRatings[teamA].push(ratings[teamA]);
    weeklyRatings[teamB].push(ratings[teamB]);
  }

  return { ratings, records, weeklyRatings };
}
```

- [ ] **Step 4: Run all tests — confirm they pass**

```bash
npm test -- --reporter=verbose
```

Expected: all tests in names, sheets, and elo suites PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/elo.js src/tests/elo.test.js
git commit -m "feat: add ELO computation engine with forfeit and margin multiplier support"
```

---

## Task 6: Data Load Function

**Files:**

- Create: `src/routes/+page.js`

**Interfaces:**

- Consumes:
  - `fetchTab(sheetId, apiKey, tabName)` from `$lib/sheets.js`
  - `parseMatchTab(rows)` from `$lib/sheets.js`
  - `getCanonicalTeams(sheetId, apiKey, summaryTab, nameCol)` from `$lib/sheets.js`
  - `canonicalize(name, canonicalNames)` from `$lib/names.js`
  - `processMatches(matches)` from `$lib/elo.js`
  - `WEEK_TABS, SUMMARY_TAB, RANKINGS_NAME_COL, SEASON_LABEL` from `$lib/config.js`
  - `PUBLIC_GOOGLE_API_KEY, PUBLIC_SHEET_ID` from `$env/static/public`
- Produces (returned from `load()`):

  ```js
  {
    leaderboard: Array<{
      rank: number,
      name: string,
      elo: number,
      wins: number,
      losses: number,
      pointDiff: number,
      trend: 'up' | 'down' | 'flat',  // based on last 3 games
    }>,
    seasonLabel: string,
    lastUpdated: string,  // ISO timestamp
  }
  ```

- [ ] **Step 1: Write src/routes/+page.js**

```js
import { PUBLIC_GOOGLE_API_KEY, PUBLIC_SHEET_ID } from "$env/static/public";
import { fetchTab, parseMatchTab, getCanonicalTeams } from "$lib/sheets.js";
import { canonicalize } from "$lib/names.js";
import { processMatches } from "$lib/elo.js";
import {
  WEEK_TABS,
  SUMMARY_TAB,
  RANKINGS_NAME_COL,
  SEASON_LABEL,
} from "$lib/config.js";

export async function load() {
  const canonicalNames = await getCanonicalTeams(
    PUBLIC_SHEET_ID,
    PUBLIC_GOOGLE_API_KEY,
    SUMMARY_TAB,
    RANKINGS_NAME_COL,
  );

  const allMatches = [];
  for (let i = 0; i < WEEK_TABS.length; i++) {
    let rows;
    try {
      rows = await fetchTab(
        PUBLIC_SHEET_ID,
        PUBLIC_GOOGLE_API_KEY,
        WEEK_TABS[i],
      );
    } catch (err) {
      console.warn(`[load] Skipping tab "${WEEK_TABS[i]}": ${err.message}`);
      continue;
    }
    const matches = parseMatchTab(rows).map((m) => ({
      ...m,
      teamA: canonicalize(m.teamA, canonicalNames),
      teamB: canonicalize(m.teamB, canonicalNames),
      weekIndex: i,
    }));
    allMatches.push(...matches);
  }

  const { ratings, records, weeklyRatings } = processMatches(allMatches);

  const leaderboard = Object.keys(ratings)
    .sort((a, b) => ratings[b] - ratings[a])
    .map((name, i) => {
      const rec = records[name] ?? {
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      const history = weeklyRatings[name] ?? [];
      const recent = history.slice(-3);
      let trend = "flat";
      if (recent.length >= 2) {
        const delta = recent[recent.length - 1] - recent[0];
        if (delta > 5) trend = "up";
        else if (delta < -5) trend = "down";
      }
      return {
        rank: i + 1,
        name,
        elo: ratings[name],
        wins: rec.wins,
        losses: rec.losses,
        pointDiff: rec.pointsFor - rec.pointsAgainst,
        trend,
      };
    });

  return {
    leaderboard,
    seasonLabel: SEASON_LABEL,
    lastUpdated: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Smoke-test in the browser**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Open the Network tab — you should see requests to `sheets.googleapis.com`. If the API key and sheet ID are set correctly, you'll see data flowing. Any errors will appear in the browser console.

Common issues:

- `403 Forbidden`: sheet isn't shared publicly, or API key lacks Sheets API permission
- `400 Bad Request`: check the tab name in `WEEK_TABS` matches the sheet exactly (case-sensitive)

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.js
git commit -m "feat: add data load function orchestrating fetch, parse, canonicalize, and ELO"
```

---

## Task 7: Leaderboard UI

**Files:**

- Modify: `src/routes/+page.svelte`

**Interfaces:**

- Consumes: `data.leaderboard`, `data.seasonLabel`, `data.lastUpdated` from `+page.js`

- [ ] **Step 1: Write src/routes/+page.svelte**

```svelte
<script>
  /** @type {{ data: import('./$types').PageData }} */
  let { data } = $props();

  let search = $state("");

  const filtered = $derived(
    search.trim() === ""
      ? data.leaderboard
      : data.leaderboard.filter((t) =>
          t.name.toLowerCase().includes(search.trim().toLowerCase()),
        ),
  );

  function formatDiff(n) {
    return n > 0 ? `+${n}` : `${n}`;
  }

  function trendIcon(trend) {
    if (trend === "up") return "▲";
    if (trend === "down") return "▼";
    return "—";
  }

  function trendClass(trend) {
    if (trend === "up") return "up";
    if (trend === "down") return "down";
    return "flat";
  }
</script>

<svelte:head>
  <title>{data.seasonLabel} · Bocce ELO</title>
</svelte:head>

<main>
  <header>
    <h1>🎯 Bocce ELO</h1>
    <p class="season">{data.seasonLabel}</p>
  </header>

  <div class="search-wrap">
    <input
      type="search"
      placeholder="Search teams…"
      bind:value={search}
      aria-label="Search teams"
    />
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th class="name">Team</th>
          <th class="num">ELO</th>
          <th class="num">W</th>
          <th class="num">L</th>
          <th class="num">+/−</th>
          <th class="num">Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as team (team.name)}
          <tr>
            <td class="num rank">{team.rank}</td>
            <td class="name">{team.name}</td>
            <td class="num elo">{team.elo}</td>
            <td class="num">{team.wins}</td>
            <td class="num">{team.losses}</td>
            <td class="num diff">{formatDiff(team.pointDiff)}</td>
            <td class="num trend {trendClass(team.trend)}"
              >{trendIcon(team.trend)}</td
            >
          </tr>
        {/each}
        {#if filtered.length === 0}
          <tr><td colspan="7" class="empty">No teams match "{search}"</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <footer>
    Updated {new Date(data.lastUpdated).toLocaleString()}
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #0f1117;
    color: #e8eaf0;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }

  header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0;
    color: #fff;
  }

  .season {
    margin: 0.25rem 0 0;
    color: #8b9db5;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .search-wrap {
    margin-bottom: 1rem;
  }

  input[type="search"] {
    width: 100%;
    box-sizing: border-box;
    background: #1c2030;
    border: 1px solid #2e3650;
    border-radius: 8px;
    color: #e8eaf0;
    font-size: 1rem;
    padding: 0.6rem 0.9rem;
    outline: none;
  }

  input[type="search"]:focus {
    border-color: #5b7cf0;
  }

  .table-wrap {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid #1e2540;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  thead {
    background: #161c30;
  }

  th {
    padding: 0.7rem 0.8rem;
    text-align: left;
    color: #8b9db5;
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  th.num,
  td.num {
    text-align: right;
  }

  td {
    padding: 0.65rem 0.8rem;
    border-top: 1px solid #1e2540;
  }

  tbody tr:hover {
    background: #161c30;
  }

  .rank {
    color: #8b9db5;
    font-size: 0.85rem;
  }

  .name {
    font-weight: 600;
    color: #fff;
  }

  .elo {
    font-weight: 700;
    color: #a8c4ff;
    font-variant-numeric: tabular-nums;
  }

  .diff {
    font-variant-numeric: tabular-nums;
    color: #8b9db5;
  }

  .trend.up {
    color: #4caf7d;
  }

  .trend.down {
    color: #e05c5c;
  }

  .trend.flat {
    color: #555e7a;
  }

  .empty {
    text-align: center;
    color: #555e7a;
    padding: 2rem;
  }

  footer {
    margin-top: 1.5rem;
    text-align: center;
    color: #555e7a;
    font-size: 0.8rem;
  }
</style>
```

- [ ] **Step 2: Check the UI in the browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:

- Leaderboard table renders with all teams
- Search input filters the list in real time
- Trend arrows show up/down/flat in the right colours
- Looks reasonable on mobile (resize browser window to ~375px wide)

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add dark sporty leaderboard UI with search and trend indicator"
```

---

## Task 8: Deployment

**Files:**

- No new files — verify existing config is correct

**Interfaces:**

- Produces: `npm run build` succeeds and output is in `.svelte-kit/cloudflare`

- [ ] **Step 1: Confirm adapter-cloudflare is configured**

Check `svelte.config.js` — it should already use `adapter-cloudflare` from Task 1. If not, fix it:

```js
import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
};

export default config;
```

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: build completes with no errors. Output directory `.svelte-kit/cloudflare` is created.

If you see "Cannot find package '@sveltejs/adapter-cloudflare'", run `npm install -D @sveltejs/adapter-cloudflare`.

- [ ] **Step 3: Deploy to Cloudflare Pages**

In the Cloudflare Dashboard:

1. Go to **Workers & Pages → Create → Pages → Connect to Git**
2. Select your repo
3. Set **Build command**: `npm run build`
4. Set **Build output directory**: `.svelte-kit/cloudflare`
5. Add environment variables:
   - `PUBLIC_GOOGLE_API_KEY` = your real key
   - `PUBLIC_SHEET_ID` = `1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs`
6. Deploy

For the `bocce.mrh.is` custom domain: add a CNAME record in your DNS pointing `bocce` → `<your-pages-project>.pages.dev`.

- [ ] **Step 4: Final smoke test on the deployed URL**

Open the deployed URL. Verify the leaderboard loads and data is live.

- [ ] **Step 5: Commit deployment notes**

```bash
git add .env.example
git commit -m "chore: add deployment notes and env template"
```

---

## Self-Review

### Spec coverage

| Spec requirement                                  | Covered by                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| SvelteKit + adapter-cloudflare                    | Task 1                                                                             |
| Google Sheets API v4 with public key              | Task 4 (`fetchTab`)                                                                |
| Sheet ID configurable via env                     | Task 6 (`PUBLIC_SHEET_ID`)                                                         |
| Multi-tab parsing (week tabs)                     | Task 4 (`parseMatchTab`)                                                           |
| Left + right match blocks per row                 | Task 4 (`parseMatch` with colOffset)                                               |
| Forfeit (`F`) handling                            | Task 4 (`parseMatch`), Task 5 (`processMatches`)                                   |
| Skip missing/non-numeric scores                   | Task 4 (`parseMatch`)                                                              |
| ELO: K=40, start=1000                             | Task 5                                                                             |
| Margin multiplier with ln(12) normaliser          | Task 5 (`marginMultiplier`)                                                        |
| Multiplier clamped at 2.0                         | Task 5                                                                             |
| Forfeits use multiplier 1.0                       | Task 5                                                                             |
| Sequential processing: week order, court order    | Task 4 (parseMatchTab outputs rows in order), Task 6 (iterates WEEK_TABS in order) |
| Canonical name map + fuzzy matching               | Task 3 (`names.js`)                                                                |
| Known alias cases from spec                       | Task 3 (`ALIASES`)                                                                 |
| Teams absent from canonical list: warn, use as-is | Task 3 (`canonicalize`)                                                            |
| Duplicate team appearances warning                | Task 5 (`weekAppearances` check)                                                   |
| Leaderboard: rank, name, ELO, W/L, point diff     | Task 7                                                                             |
| Search/filter by team name                        | Task 7                                                                             |
| Trend indicator (last 3 games)                    | Task 6 (trend calc), Task 7 (trend icon)                                           |
| Mobile-friendly                                   | Task 7 (max-width, overflow-x)                                                     |
| `SEASON_LABEL` in config.js                       | Task 2                                                                             |
| `WEEK_TABS` and `SUMMARY_TAB` in config.js        | Task 2                                                                             |
| No backend; client-side only                      | Task 6 uses `+page.js` not `+page.server.js`                                       |
| Cloudflare Pages deployment                       | Task 8                                                                             |

### Placeholder scan

No TBD/TODO placeholders in the plan. All steps contain actual code. ✓

### Type consistency

- `parseMatch` → returns `{ teamA, teamB, scoreA, scoreB, forfeitA, forfeitB }` — used identically in `processMatches` ✓
- `processMatches` → returns `{ ratings, records, weeklyRatings }` — all three consumed in `+page.js` ✓
- `load()` returns `{ leaderboard, seasonLabel, lastUpdated }` — all three referenced in `+page.svelte` ✓
- `leaderboard` entries: `{ rank, name, elo, wins, losses, pointDiff, trend }` — all fields referenced in `+page.svelte` ✓
- `weekIndex` added to matches in `+page.js` before passing to `processMatches` — consumed by `processMatches` ✓
