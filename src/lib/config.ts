export const SEASON_LABEL = "Season 10";

export const SUMMARY_TAB = "Standings";

export const WEEK_TABS: string[] = [
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
  "Week 7",
  "Week 8",
];

// Set to a tab name to force it as "upcoming" (unplayed matchups).
// Set to null to auto-detect from the last week in WEEK_TABS.
export const UPCOMING_TAB: string | null = null;

// 0-indexed column in SUMMARY_TAB where canonical team names live.
// Confirmed from actual sheet: col0=blank, col1=RANKING, col2=blank, col3=TEAM
export const RANKINGS_NAME_COL = 3;
export const RANKINGS_RANK_COL = 1;

export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Vb_iXA83NK33Jvl5lSr9jNoQTelFlIhBnac5KjjkiDI";

export const MY_TEAM = "Walter & the Bocce Bunch";
