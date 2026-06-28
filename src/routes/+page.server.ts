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
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

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

  const {
    ratings,
    records,
    weeklyRatings: _weeklyRatings,
  } = processMatches(allMatches);

  // Resolve upcoming matchups (with court numbers)
  const resolveMatchups = (
    rows: string[][],
  ): {
    teamA: string;
    teamB: string;
    court: string | null;
    probA: number;
  }[] =>
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

  let upcomingMatches: {
    teamA: string;
    teamB: string;
    court: string | null;
    probA: number;
  }[] = [];
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

  // Build team → array of this-week games (normalize keys for robust matching)
  const upcomingByTeam: Record<string, UpcomingGame[]> = {};
  const addUpcoming = (key: string, entry: UpcomingGame): void => {
    const k = normalize(key);
    if (!upcomingByTeam[k]) {
      upcomingByTeam[k] = [];
    }
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
