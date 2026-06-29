import type { Match, MatchupWithCourt, OfficialRankings } from "./types.js";

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

export type RowsByTab = Record<string, string[][]>;

interface BatchGetResponse {
  valueRanges?: { values?: string[][] }[];
}

interface FetchTabsOptions {
  timeoutMs?: number;
}

export async function fetchTabs(
  sheetId: string,
  apiKey: string,
  tabNames: string[],
  options: FetchTabsOptions = {},
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
        { cause: err },
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

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

function parseScore(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  return Number(raw);
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

// Returns canonical names in sheet row order; callers use these for lookup only,
// not positional indexing, so order does not matter.
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
