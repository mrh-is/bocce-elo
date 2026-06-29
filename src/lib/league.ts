import { expectedScore, processMatches, STARTING_RATING } from "./elo.js";
import { canonicalize, normalize } from "./names.js";
import {
  parseCanonicalTeams,
  parseMatchTab,
  parseMatchupsWithCourts,
  parseOfficialRankings,
  type RowsByTab,
} from "./sheets.js";
import type {
  LeaderboardEntry,
  Match,
  PageData,
  Ratings,
  Records,
  UpcomingGame,
} from "./types.js";

interface UpcomingMatchup {
  teamA: string;
  teamB: string;
  court: string | null;
  probA: number;
}

export interface LeaguePageConfig {
  weekTabs: string[];
  upcomingTab: string | null;
  summaryTab: string;
  rankingsNameCol: number;
  rankingsRankCol: number;
  seasonLabel: string;
  sheetUrl: string;
  myTeam: string;
  now?: Date;
}

function parseMatchesByWeek(
  rowsByTab: RowsByTab,
  weekTabs: string[],
  canonicalNames: string[],
): {
  allMatches: Match[];
  weekRowsCache: string[][][];
} {
  const allMatches: Match[] = [];
  const weekRowsCache: string[][][] = [];

  for (let i = 0; i < weekTabs.length; i++) {
    const rows = rowsByTab[weekTabs[i]] ?? [];
    weekRowsCache.push(rows);
    allMatches.push(
      ...parseMatchTab(rows).map((match) => ({
        ...match,
        teamA: canonicalize(match.teamA, canonicalNames),
        teamB: canonicalize(match.teamB, canonicalNames),
        weekIndex: i,
      })),
    );
  }

  return { allMatches, weekRowsCache };
}

function toUpcomingMatchups(
  rows: string[][],
  ratings: Ratings,
  canonicalNames: string[],
): UpcomingMatchup[] {
  return parseMatchupsWithCourts(rows).map((matchup) => {
    const teamA = canonicalize(matchup.teamA, canonicalNames);
    const teamB = canonicalize(matchup.teamB, canonicalNames);
    const ratingA = ratings[teamA] ?? STARTING_RATING;
    const ratingB = ratings[teamB] ?? STARTING_RATING;

    return {
      teamA,
      teamB,
      court: matchup.court,
      probA: Math.round(expectedScore(ratingA, ratingB) * 100),
    };
  });
}

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

function buildUpcomingIndex(
  upcomingMatches: UpcomingMatchup[],
): Record<string, UpcomingGame[]> {
  const upcomingByTeam: Record<string, UpcomingGame[]> = {};

  for (const matchup of upcomingMatches) {
    const teamAKey = normalize(matchup.teamA);
    const teamBKey = normalize(matchup.teamB);
    upcomingByTeam[teamAKey] ??= [];
    upcomingByTeam[teamBKey] ??= [];
    upcomingByTeam[teamAKey].push({
      opponent: matchup.teamB,
      prob: matchup.probA,
      court: matchup.court,
    });
    upcomingByTeam[teamBKey].push({
      opponent: matchup.teamA,
      prob: 100 - matchup.probA,
      court: matchup.court,
    });
  }

  return upcomingByTeam;
}

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

export function buildLeaguePageData(
  rowsByTab: RowsByTab,
  config: LeaguePageConfig,
): PageData {
  const summaryRows = rowsByTab[config.summaryTab] ?? [];
  const canonicalNames = parseCanonicalTeams(
    summaryRows,
    config.rankingsNameCol,
  );
  const officialRankings = parseOfficialRankings(
    summaryRows,
    config.rankingsNameCol,
    config.rankingsRankCol,
  );
  const { allMatches, weekRowsCache } = parseMatchesByWeek(
    rowsByTab,
    config.weekTabs,
    canonicalNames,
  );
  const { ratings, records } = processMatches(allMatches);

  // Ensure all teams from official standings appear in ratings even if no matches played yet
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

  const upcomingMatches = resolveUpcomingMatchups(
    rowsByTab,
    config,
    weekRowsCache,
    ratings,
    canonicalNames,
  );

  return {
    leaderboard: buildLeaderboard(
      ratings,
      records,
      officialRankings,
      buildUpcomingIndex(upcomingMatches),
      config.myTeam,
    ),
    seasonLabel: config.seasonLabel,
    lastUpdated: (config.now ?? new Date()).toISOString(),
    sheetUrl: config.sheetUrl,
    myTeam: config.myTeam,
  };
}
