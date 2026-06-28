export type Match = {
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  forfeitA: boolean;
  forfeitB: boolean;
  weekIndex?: number;
};

export type ScheduledMatch = {
  teamA: string;
  teamB: string;
};

export type MatchupWithCourt = {
  teamA: string;
  teamB: string;
  court: string | null;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type Ratings = Record<string, number>;
export type Records = Record<string, TeamRecord>;
export type WeeklyRatings = Record<string, number[]>;
export type OfficialRankings = Record<string, number>;

export type ProcessMatchesResult = {
  ratings: Ratings;
  records: Records;
  weeklyRatings: WeeklyRatings;
};

export type UpcomingGame = {
  opponent: string;
  prob: number;
  court: string | null;
};

export type LeaderboardEntry = {
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
};

export type PageData = {
  leaderboard: LeaderboardEntry[];
  seasonLabel: string;
  lastUpdated: string;
  sheetUrl: string;
  myTeam: string;
};
