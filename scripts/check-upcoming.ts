import { fetchTabs } from "../src/lib/sheets.js";
import { buildLeaguePageData } from "../src/lib/league.js";
import {
  WEEK_TABS,
  UPCOMING_TAB,
  SUMMARY_TAB,
  RANKINGS_NAME_COL,
  RANKINGS_RANK_COL,
  SEASON_LABEL,
  SHEET_URL,
  MY_TEAM,
} from "../src/lib/config.js";

const apiKey = process.env.PUBLIC_GOOGLE_API_KEY;
const sheetId = process.env.PUBLIC_SHEET_ID;

if (!apiKey || !sheetId) {
  console.error(
    "Missing PUBLIC_GOOGLE_API_KEY or PUBLIC_SHEET_ID in environment",
  );
  process.exit(1);
}

const requiredTabs = [
  ...new Set(
    [SUMMARY_TAB, ...WEEK_TABS, UPCOMING_TAB].filter((t): t is string =>
      Boolean(t),
    ),
  ),
];

const rowsByTab = await fetchTabs(sheetId, apiKey, requiredTabs);
const data = buildLeaguePageData(rowsByTab, {
  weekTabs: WEEK_TABS,
  upcomingTab: UPCOMING_TAB,
  summaryTab: SUMMARY_TAB,
  rankingsNameCol: RANKINGS_NAME_COL,
  rankingsRankCol: RANKINGS_RANK_COL,
  seasonLabel: SEASON_LABEL,
  sheetUrl: SHEET_URL,
  myTeam: MY_TEAM,
});

const withUpcoming = data.leaderboard.filter((t) => t.upcoming.length > 0);
const withoutUpcoming = data.leaderboard.filter((t) => t.upcoming.length === 0);

if (withUpcoming.length === 0) {
  console.log(
    "No upcoming games for any team (off-season or all weeks played)",
  );
  process.exit(0);
}

if (withoutUpcoming.length === 0) {
  console.log(
    `All ${withUpcoming.length} teams have upcoming games — no mismatches`,
  );
  process.exit(0);
}

console.error(
  `${withUpcoming.length} teams have upcoming games, but ${withoutUpcoming.length} do not:\n`,
);
for (const team of withoutUpcoming) {
  console.error(`  - ${team.name}`);
}
console.error("\nThis usually means a team name in the week tab doesn't match");
console.error("the canonical name in Standings. Check src/lib/names.ts.");
process.exit(1);
