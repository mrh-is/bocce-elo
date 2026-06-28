// Season configuration and sheet structure
const SHEET_ID = '1vhfcIsIHrt4-U11LdutPz5hfxfjdBhEPFaLXMZz0KRs';

export const SEASON_LABEL = 'Season 10';

export const SUMMARY_TAB = 'Standings';

export const WEEK_TABS = [
	'Week 1',
	'Week 2',
	'Week 3',
	'Week 4',
	'Week 5',
	'Week 6',
	'Week 7',
];

// Force a specific tab to be treated as "upcoming" (unplayed matchups).
// Set to null to auto-detect from the last week in WEEK_TABS.
export const UPCOMING_TAB = 'Week 8';

// 0-indexed column in SUMMARY_TAB where canonical team names live.
// Confirmed from actual sheet: col0=blank, col1=RANKING, col2=blank, col3=TEAM
export const RANKINGS_NAME_COL = 3;
export const RANKINGS_RANK_COL = 1;

export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;

export const MY_TEAM = 'Walter and the Bocce Bunch';
