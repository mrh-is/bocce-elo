const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function fetchTab(sheetId, apiKey, tabName) {
	const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(tabName)}?key=${apiKey}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Sheets API error for tab "${tabName}": ${res.status} ${res.statusText}`);
	const data = await res.json();
	return data.values ?? [];
}

export function parseMatch(row, colOffset) {
	const teamA = row[colOffset + 1]?.trim();
	const teamB = row[colOffset + 3]?.trim();
	if (!teamA || !teamB) return null;

	const rawA = row[colOffset + 2]?.trim() ?? '';
	const rawB = row[colOffset + 4]?.trim() ?? '';

	const forfeitA = rawA.toUpperCase() === 'F';
	const forfeitB = rawB.toUpperCase() === 'F';

	if (!forfeitA && !forfeitB) {
		if (!rawA && !rawB) return null;
		const scoreA = parseInt(rawA, 10);
		const scoreB = parseInt(rawB, 10);
		if (isNaN(scoreA) || isNaN(scoreB)) return null;
		return { teamA, teamB, scoreA, scoreB, forfeitA: false, forfeitB: false };
	}

	return { teamA, teamB, scoreA: null, scoreB: null, forfeitA, forfeitB };
}

export function parseMatchTab(rows) {
	const matches = [];
	for (const row of rows) {
		if (!row || row.length < 2) continue;
		// Actual sheet layout: [blank, court#, teamA, scoreA, teamB, scoreB, blank, teamA2, scoreA2, teamB2, scoreB2]
		const left = parseMatch(row, 1);
		if (left) matches.push(left);
		const right = parseMatch(row, 6);
		if (right) matches.push(right);
	}
	return matches;
}

export async function getCanonicalTeams(sheetId, apiKey, summaryTab, nameCol) {
	const rows = await fetchTab(sheetId, apiKey, summaryTab);
	const names = new Set();
	for (const row of rows.slice(1)) { // skip header row
		const name = row[nameCol]?.trim();
		if (name) names.add(name);
	}
	return [...names];
}

export async function getOfficialRankings(sheetId, apiKey, summaryTab, nameCol, rankCol) {
	const rows = await fetchTab(sheetId, apiKey, summaryTab);
	const rankings = {};
	for (const row of rows.slice(1)) {
		const name = row[nameCol]?.trim();
		const rank = parseInt(row[rankCol]?.trim(), 10);
		if (name && !isNaN(rank)) rankings[name] = rank;
	}
	return rankings;
}

export function parseScheduledMatch(row, colOffset) {
	const teamA = row[colOffset + 1]?.trim();
	const teamB = row[colOffset + 3]?.trim();
	if (!teamA || !teamB) return null;
	const rawA = row[colOffset + 2]?.trim() ?? '';
	const rawB = row[colOffset + 4]?.trim() ?? '';
	// "Scheduled" = teams listed but both scores blank (not yet played)
	if (!rawA && !rawB) return { teamA, teamB };
	return null;
}

// Returns all matchup pairs with court numbers regardless of score status.
// Layout: col0=blank, col1=court#, col2=teamA, col3=scoreA, col4=teamB, col5=scoreB,
//         col6=blank, col7=teamA2, col8=scoreA2, col9=teamB2, col10=scoreB2
// Each row is one court; left block = game 1, right block = game 2 (after swap).
// Both games on a row use the same court number.
export function parseMatchupsWithCourts(rows) {
	// Collect game-1 (left block) and game-2 (right block) separately so that
	// every team's game 1 is inserted into upcomingByTeam before their game 2,
	// regardless of which row each game appears in.
	const game1 = [];
	const game2 = [];
	for (const row of rows) {
		if (!row || row.length < 5) continue;
		const court = row[1]?.trim() || null;
		const leftA = row[2]?.trim();
		const leftB = row[4]?.trim();
		if (leftA && leftB) game1.push({ teamA: leftA, teamB: leftB, court });
		const rightA = row[7]?.trim();
		const rightB = row[9]?.trim();
		if (rightA && rightB) game2.push({ teamA: rightA, teamB: rightB, court });
	}
	return [...game1, ...game2];
}

export function parseScheduledMatchTab(rows) {
	const matches = [];
	for (const row of rows) {
		if (!row || row.length < 2) continue;
		const left = parseScheduledMatch(row, 1);
		if (left) matches.push(left);
		const right = parseScheduledMatch(row, 6);
		if (right) matches.push(right);
	}
	return matches;
}
