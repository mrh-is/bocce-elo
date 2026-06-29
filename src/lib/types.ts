interface MatchBase {
  teamA: string;
  teamB: string;
  weekIndex?: number;
}

export interface ScoredMatch extends MatchBase {
  kind: "scored";
  scoreA: number;
  scoreB: number;
}

export interface ForfeitMatch extends MatchBase {
  kind: "forfeit";
  forfeitingTeam: "A" | "B";
}

export type Match = ScoredMatch | ForfeitMatch;

export interface MatchupWithCourt {
  teamA: string;
  teamB: string;
  court: string | null;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export type Ratings = Record<string, number>;
export type Records = Record<string, TeamRecord>;
export type OfficialRankings = Record<string, number>;

export interface ProcessMatchesResult {
  ratings: Ratings;
  records: Records;
}

export interface UpcomingGame {
  opponent: string;
  prob: number;
  court: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  officialRank: number | null;
  rankDiff: number | null;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  upcoming: UpcomingGame[];
  isMyTeam: boolean;
}

export interface PageData {
  leaderboard: LeaderboardEntry[];
  seasonLabel: string;
  lastUpdated: Date;
  sheetUrl: string;
  myTeam: string;
}
