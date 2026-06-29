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

export type RowsByTab = Record<string, string[][]>;

interface BatchGetResponse {
  valueRanges?: { values?: string[][] }[];
}

export async function fetchTabs(
  sheetId: string,
  apiKey: string,
  tabNames: string[],
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
  const res = await fetch(url);
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

export async function fetchTab(
  sheetId: string,
  apiKey: string,
  tabName: string,
): Promise<string[][]> {
  const rowsByTab = await fetchTabs(sheetId, apiKey, [tabName]);
  return rowsByTab[tabName] ?? [];
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

export async function getCanonicalTeams(
  sheetId: string,
  apiKey: string,
  summaryTab: string,
  nameCol: number,
): Promise<string[]> {
  const rows = await fetchTab(sheetId, apiKey, summaryTab);
  return parseCanonicalTeams(rows, nameCol);
}

export async function getOfficialRankings(
  sheetId: string,
  apiKey: string,
  summaryTab: string,
  nameCol: number,
  rankCol: number,
): Promise<OfficialRankings> {
  const rows = await fetchTab(sheetId, apiKey, summaryTab);
  return parseOfficialRankings(rows, nameCol, rankCol);
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
