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

interface UpcomingMatchup {
  teamA: string;
  teamB: string;
  court: string | null;
  probA: number;
}

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
    if (matchups.length > 0) {
      return matchups;
    }
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
    if (!upcomingByTeam[kA]) {
      upcomingByTeam[kA] = [];
    }
    if (!upcomingByTeam[kB]) {
      upcomingByTeam[kB] = [];
    }
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
      if (a.officialRank === null && b.officialRank === null) {
        return 0;
      }
      if (a.officialRank === null) {
        return 1;
      }
      if (b.officialRank === null) {
        return -1;
      }
      return a.officialRank - b.officialRank;
    });
}

export async function load(): Promise<PageData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

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
