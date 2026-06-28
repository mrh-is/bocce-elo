import { PUBLIC_GOOGLE_API_KEY, PUBLIC_SHEET_ID } from '$env/static/public';
import { fetchTab, parseMatchTab, getCanonicalTeams } from '$lib/sheets.js';
import { canonicalize } from '$lib/names.js';
import { processMatches } from '$lib/elo.js';
import { WEEK_TABS, SUMMARY_TAB, RANKINGS_NAME_COL, SEASON_LABEL } from '$lib/config.js';

export async function load() {
	let canonicalNames = [];
	try {
		canonicalNames = await getCanonicalTeams(
			PUBLIC_SHEET_ID, PUBLIC_GOOGLE_API_KEY, SUMMARY_TAB, RANKINGS_NAME_COL
		);
	} catch (err) {
		console.warn(`[load] Could not fetch canonical teams: ${err.message}`);
	}

	const allMatches = [];
	for (let i = 0; i < WEEK_TABS.length; i++) {
		let rows;
		try {
			rows = await fetchTab(PUBLIC_SHEET_ID, PUBLIC_GOOGLE_API_KEY, WEEK_TABS[i]);
		} catch (err) {
			console.warn(`[load] Skipping tab "${WEEK_TABS[i]}": ${err.message}`);
			continue;
		}
		const matches = parseMatchTab(rows).map((m) => ({
			...m,
			teamA: canonicalize(m.teamA, canonicalNames),
			teamB: canonicalize(m.teamB, canonicalNames),
			weekIndex: i,
		}));
		allMatches.push(...matches);
	}

	const { ratings, records, weeklyRatings } = processMatches(allMatches);

	const leaderboard = Object.keys(ratings)
		.sort((a, b) => ratings[b] - ratings[a])
		.map((name, i) => {
			const rec = records[name] ?? { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
			const history = weeklyRatings[name] ?? [];
			const recent = history.slice(-3);
			let trend = 'flat';
			if (recent.length >= 2) {
				const delta = recent[recent.length - 1] - recent[0];
				if (delta > 5) trend = 'up';
				else if (delta < -5) trend = 'down';
			}
			return {
				rank: i + 1,
				name,
				elo: ratings[name],
				wins: rec.wins,
				losses: rec.losses,
				pointDiff: rec.pointsFor - rec.pointsAgainst,
				trend,
			};
		});

	return {
		leaderboard,
		seasonLabel: SEASON_LABEL,
		lastUpdated: new Date().toISOString(),
	};
}
