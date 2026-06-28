import type {
  Match,
  Ratings,
  Records,
  WeeklyRatings,
  ProcessMatchesResult,
  TeamRecord,
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

export function processMatches(matches: Match[]): ProcessMatchesResult {
  const ratings: Ratings = {};
  const records: Records = {};
  const weeklyRatings: WeeklyRatings = {};
  const weekAppearances: Record<number, Record<string, number>> = {};

  for (const match of matches) {
    const { teamA, teamB, scoreA, scoreB, forfeitA, forfeitB, weekIndex } =
      match;

    initTeam(ratings, records, weeklyRatings, teamA);
    initTeam(ratings, records, weeklyRatings, teamB);

    if (weekIndex !== undefined) {
      if (!weekAppearances[weekIndex]) {
        weekAppearances[weekIndex] = {};
      }
      weekAppearances[weekIndex][teamA] =
        (weekAppearances[weekIndex][teamA] ?? 0) + 1;
      weekAppearances[weekIndex][teamB] =
        (weekAppearances[weekIndex][teamB] ?? 0) + 1;
      if (weekAppearances[weekIndex][teamA] > 2) {
        // eslint-disable-next-line no-console
        console.warn(
          `[elo] ${teamA} appears more than 2 times in week ${weekIndex}`,
        );
      }
      if (weekAppearances[weekIndex][teamB] > 2) {
        // eslint-disable-next-line no-console
        console.warn(
          `[elo] ${teamB} appears more than 2 times in week ${weekIndex}`,
        );
      }
    }

    const rA = ratings[teamA];
    const rB = ratings[teamB];
    const eA = expectedScore(rA, rB);
    const eB = 1 - eA;

    let actualA: number, actualB: number, mult: number;

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
    } else if (scoreA === scoreB) {
      // Both null only when both are forfeits, handled above; in the non-forfeit path these are numbers
      actualA = 0.5;
      actualB = 0.5;
      mult = 1.0;
      records[teamA].ties++;
      records[teamB].ties++;
      records[teamA].pointsFor += scoreA!;
      records[teamA].pointsAgainst += scoreB!;
      records[teamB].pointsFor += scoreB!;
      records[teamB].pointsAgainst += scoreA!;
    } else {
      actualA = scoreA! > scoreB! ? 1 : 0;
      actualB = scoreB! > scoreA! ? 1 : 0;
      mult = marginMultiplier(
        Math.max(scoreA!, scoreB!),
        Math.min(scoreA!, scoreB!),
      );

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
    }

    ratings[teamA] = Math.round(rA + K * mult * (actualA - eA));
    ratings[teamB] = Math.round(rB + K * mult * (actualB - eB));

    weeklyRatings[teamA].push(ratings[teamA]);
    weeklyRatings[teamB].push(ratings[teamB]);
  }

  return { ratings, records, weeklyRatings };
}
