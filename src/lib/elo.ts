import type {
  Match,
  Ratings,
  Records,
  WeeklyRatings,
  ProcessMatchesResult,
} from "./types.js";

const STARTING_RATING = 1000;
const K = 40;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function marginMultiplier(
  winnerScore: number,
  loserScore: number,
): number {
  const margin = Math.abs(winnerScore - loserScore);
  return Math.min(Math.log(margin + 1) / Math.log(12), 2.0);
}

function initTeam(
  ratings: Ratings,
  records: Records,
  weeklyRatings: WeeklyRatings,
  name: string,
): void {
  if (!ratings[name]) {
    ratings[name] = STARTING_RATING;
    records[name] = {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
    weeklyRatings[name] = [];
  }
}

function trackWeekAppearance(
  weekAppearances: Record<number, Record<string, number>>,
  weekIndex: number,
  team: string,
): void {
  if (!weekAppearances[weekIndex]) {
    weekAppearances[weekIndex] = {};
  }
  weekAppearances[weekIndex][team] =
    (weekAppearances[weekIndex][team] ?? 0) + 1;
  if (weekAppearances[weekIndex][team] > 2) {
    // eslint-disable-next-line no-console
    console.warn(
      `[elo] ${team} appears more than 2 times in week ${weekIndex}`,
    );
  }
}

function resolveMatchOutcome(
  match: Match,
  records: Records,
): { actualA: number; actualB: number; mult: number } {
  const { teamA, teamB, scoreA, scoreB, forfeitA, forfeitB } = match;

  if (forfeitA) {
    records[teamA].losses++;
    records[teamB].wins++;
    return { actualA: 0, actualB: 1, mult: 1.0 };
  }

  if (forfeitB) {
    records[teamA].wins++;
    records[teamB].losses++;
    return { actualA: 1, actualB: 0, mult: 1.0 };
  }

  if (scoreA === scoreB) {
    records[teamA].ties++;
    records[teamB].ties++;
    records[teamA].pointsFor += scoreA!;
    records[teamA].pointsAgainst += scoreB!;
    records[teamB].pointsFor += scoreB!;
    records[teamB].pointsAgainst += scoreA!;
    return { actualA: 0.5, actualB: 0.5, mult: 1.0 };
  }

  if (scoreA! > scoreB!) {
    records[teamA].wins++;
    records[teamB].losses++;
  } else {
    records[teamA].losses++;
    records[teamB].wins++;
  }
  records[teamA].pointsFor += scoreA!;
  records[teamA].pointsAgainst += scoreB!;
  records[teamB].pointsFor += scoreB!;
  records[teamB].pointsAgainst += scoreA!;

  return {
    actualA: scoreA! > scoreB! ? 1 : 0,
    actualB: scoreB! > scoreA! ? 1 : 0,
    mult: marginMultiplier(
      Math.max(scoreA!, scoreB!),
      Math.min(scoreA!, scoreB!),
    ),
  };
}

export function processMatches(matches: Match[]): ProcessMatchesResult {
  const ratings: Ratings = {};
  const records: Records = {};
  const weeklyRatings: WeeklyRatings = {};
  const weekAppearances: Record<number, Record<string, number>> = {};

  for (const match of matches) {
    const { teamA, teamB, weekIndex } = match;

    initTeam(ratings, records, weeklyRatings, teamA);
    initTeam(ratings, records, weeklyRatings, teamB);

    if (weekIndex !== undefined) {
      trackWeekAppearance(weekAppearances, weekIndex, teamA);
      trackWeekAppearance(weekAppearances, weekIndex, teamB);
    }

    const rA = ratings[teamA];
    const rB = ratings[teamB];
    const eA = expectedScore(rA, rB);
    const eB = 1 - eA;

    const { actualA, actualB, mult } = resolveMatchOutcome(match, records);

    ratings[teamA] = Math.round(rA + K * mult * (actualA - eA));
    ratings[teamB] = Math.round(rB + K * mult * (actualB - eB));

    weeklyRatings[teamA].push(ratings[teamA]);
    weeklyRatings[teamB].push(ratings[teamB]);
  }

  return { ratings, records, weeklyRatings };
}
