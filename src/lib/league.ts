import { expectedScore, processMatches } from "./elo.js";
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
): { allMatches: Match[]; weekRowsCache: { weekIndex: number; rows: string[][] }[] } {
  const allMatches: Match[] = [];
  const weekRowsCache: { weekIndex: number; rows: string[][] }[] = [];

  for (let i = 0; i < weekTabs.length; i++) {
    const rows = rowsByTab[weekTabs[i]] ?? [];
    weekRowsCache.push({ weekIndex: i, rows });
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
    const ratingA = ratings[teamA] ?? 1000;
    const ratingB = ratings[teamB] ?? 1000;

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
  weekRowsCache: { weekIndex: number; rows: string[][] }[],
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

  for (let i = weekRowsCache.length - 1; i >= 0; i--) {
    const matchups = toUpcomingMatchups(
      weekRowsCache[i].rows,
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
  return Object.keys(ratings)
    .sort((a, b) => ratings[b] - ratings[a])
    .map((name, index) => {
      const record = records[name] ?? {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      const eloRank = index + 1;
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
  const canonicalNames = parseCanonicalTeams(summaryRows, config.rankingsNameCol);
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
      ratings[name] = 1000;
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
