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
