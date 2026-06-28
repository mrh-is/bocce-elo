import { describe, it, expect } from 'vitest';
import { parseMatch, parseMatchTab } from '../lib/sheets.js';

describe('parseMatch', () => {
	it('parses a normal game from left block (colOffset=0)', () => {
		const row = ['1', 'Team Alpha', '21', 'Team Beta', '14', '', '2', 'Team Gamma', '18', 'Team Delta', '21'];
		expect(parseMatch(row, 0)).toEqual({
			teamA: 'Team Alpha', teamB: 'Team Beta',
			scoreA: 21, scoreB: 14,
			forfeitA: false, forfeitB: false,
		});
	});

	it('parses a normal game from right block (colOffset=5)', () => {
		// Row layout: [court, teamA, scoreA, teamB, scoreB, blank, teamA2, scoreA2, teamB2, scoreB2]
		// Right block has NO second court# column — blank is at index 5, teamA2 at index 6.
		const row = ['1', 'Team Alpha', '21', 'Team Beta', '14', '', 'Team Gamma', '18', 'Team Delta', '21'];
		expect(parseMatch(row, 5)).toEqual({
			teamA: 'Team Gamma', teamB: 'Team Delta',
			scoreA: 18, scoreB: 21,
			forfeitA: false, forfeitB: false,
		});
	});

	it('returns null when team name is missing', () => {
		const row = ['1', '', '21', 'Team Beta', '14'];
		expect(parseMatch(row, 0)).toBeNull();
	});

	it('returns null when scores are missing (blank, not forfeit)', () => {
		const row = ['1', 'Team Alpha', '', 'Team Beta', ''];
		expect(parseMatch(row, 0)).toBeNull();
	});

	it('handles forfeit on score A', () => {
		const row = ['1', 'Team Alpha', 'F', 'Team Beta', '21'];
		expect(parseMatch(row, 0)).toEqual({
			teamA: 'Team Alpha', teamB: 'Team Beta',
			scoreA: null, scoreB: null,
			forfeitA: true, forfeitB: false,
		});
	});

	it('handles forfeit on score B', () => {
		const row = ['1', 'Team Alpha', '21', 'Team Beta', 'F'];
		expect(parseMatch(row, 0)).toEqual({
			teamA: 'Team Alpha', teamB: 'Team Beta',
			scoreA: null, scoreB: null,
			forfeitA: false, forfeitB: true,
		});
	});

	it('returns null when row is too short for given colOffset', () => {
		const row = ['1', 'Team Alpha', '21', 'Team Beta', '14'];
		expect(parseMatch(row, 5)).toBeNull();
	});
});

describe('parseMatchTab', () => {
	it('extracts matches from both blocks across multiple rows', () => {
		// Actual sheet layout: [blank, court#, tA, sA, tB, sB, blank, tA2, sA2, tB2, sB2]
		const rows = [
			['', '1', 'Alpha', '21', 'Beta', '14', '', 'Gamma', '18', 'Delta', '21'],
			[],  // blank row — skip
			['', '3', 'Epsilon', '21', 'Zeta', '10', '', 'Eta', 'F', 'Theta', '21'],
		];
		const matches = parseMatchTab(rows);
		expect(matches).toHaveLength(4);
		expect(matches[0].teamA).toBe('Alpha');
		expect(matches[1].teamA).toBe('Gamma');
		expect(matches[3].forfeitA).toBe(true);
		expect(matches[3].teamA).toBe('Eta');
	});

	it('skips header row (GAME 1 / GAME 2) gracefully', () => {
		// The Sheets API returns the header row; teamB slot is blank → returns null
		const rows = [
			['', 'GAME 1', '', '', '', '', 'GAME 2', '', '', ''],
		];
		expect(parseMatchTab(rows)).toHaveLength(0);
	});

	it('skips a block when both score cells are blank', () => {
		const rows = [
			['', '1', 'Alpha', '', 'Beta', ''],
		];
		expect(parseMatchTab(rows)).toHaveLength(0);
	});
});
