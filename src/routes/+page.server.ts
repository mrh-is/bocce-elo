import { PUBLIC_GOOGLE_API_KEY, PUBLIC_SHEET_ID } from "$env/static/public";
import { buildLeaguePageData } from "$lib/league.js";
import { fetchTabs } from "$lib/sheets.js";
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
import type { PageData } from "$lib/types.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: PageData | null = null;
let cachedAt = 0;
let inFlight: Promise<PageData> | null = null;

function requiredTabs(): string[] {
  return [
    ...new Set(
      [SUMMARY_TAB, ...WEEK_TABS, UPCOMING_TAB].filter(
        (tabName): tabName is string => Boolean(tabName),
      ),
    ),
  ];
}

async function refreshData(): Promise<PageData> {
  const rowsByTab = await fetchTabs(
    PUBLIC_SHEET_ID,
    PUBLIC_GOOGLE_API_KEY,
    requiredTabs(),
  );

  cached = buildLeaguePageData(rowsByTab, {
    weekTabs: WEEK_TABS,
    upcomingTab: UPCOMING_TAB,
    summaryTab: SUMMARY_TAB,
    rankingsNameCol: RANKINGS_NAME_COL,
    rankingsRankCol: RANKINGS_RANK_COL,
    seasonLabel: SEASON_LABEL,
    sheetUrl: SHEET_URL,
    myTeam: MY_TEAM,
  });
  cachedAt = Date.now();
  return cached;
}

export async function load(): Promise<PageData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  if (!inFlight) {
    inFlight = refreshData().finally(() => {
      inFlight = null;
    });
  }

  try {
    return await inFlight;
  } catch (err) {
    console.error("Failed to load league data:", err);
    if (!cached) {
      throw err;
    }
    return cached;
  }
}

export const __testing = {
  expireCache() {
    cachedAt = 0;
  },
};
