import { describe, it, expect } from 'vitest';
import { normalize, canonicalize, ALIASES } from '../lib/names.js';

describe('normalize', () => {
	it('lowercases and strips punctuation', () => {
		expect(normalize("L&O: SHU")).toBe('lo shu');
	});
	it('trims whitespace', () => {
		expect(normalize("  Boccegenius  ")).toBe('boccegenius');
	});
	it('preserves digits', () => {
		expect(normalize("Balls5Eva")).toBe('balls5eva');
	});
});

describe('canonicalize', () => {
	const canonical = [
		'1 Ball, 2 Balls, Red Balls, Blue Balls',
		'Balltime High',
		'Ballz5Eva',
		'Bocce-lism',
		'Bocce-r? I barely know her!',
		'Deep Throwed It',
		'Gay De-Bocce-ry',
		'I Wanna Dance With Some Bocce',
		'InGaysion of the Bocce Snatchers',
		'Irritable Bocce Syndrome',
		'Itty Bitty Bocce Committee',
		'Lawn Order: Special Homo Unit',
		'Lawn and Order: Pallina Intent',
		'Love is a Bocce Field',
		'Resting Bocce Faces',
		'Slobberknockin on Ediballs',
		'Son of a Be-occe',
		'Teeny Weenie Pallinis',
		'The House Of Bocce',
		'Throws of Despair',
		'Walter and the Bocce Bunch',
		'boccegenius',
	];

	it('resolves known aliases', () => {
		// Truncations
		expect(canonicalize("Ingaysion of the Bocce", canonical)).toBe('InGaysion of the Bocce Snatchers');
		expect(canonicalize("Slobberknockin'", canonical)).toBe('Slobberknockin on Ediballs');
		expect(canonicalize("Teeny Weenie", canonical)).toBe('Teeny Weenie Pallinis');
		// L&O variants (L&O: SHU → normalize → 'lo shu')
		expect(canonicalize("L&O: SHU", canonical)).toBe('Lawn Order: Special Homo Unit');
		expect(canonicalize("L & O: Special Homo Unit", canonical)).toBe('Lawn Order: Special Homo Unit');
		expect(canonicalize("L&O: PI", canonical)).toBe('Lawn and Order: Pallina Intent');
		expect(canonicalize("L & O: Pallina Intent", canonical)).toBe('Lawn and Order: Pallina Intent');
		// Typos
		expect(canonicalize("Balls5Eva", canonical)).toBe('Ballz5Eva');
		expect(canonicalize("Deeped Throwed It", canonical)).toBe('Deep Throwed It');
		expect(canonicalize("Irratable Bocce Syndrome", canonical)).toBe('Irritable Bocce Syndrome');
		expect(canonicalize("Ball Time High", canonical)).toBe('Balltime High');
	});

	it('resolves via normalize() alone (no explicit alias needed)', () => {
		// These normalize to the same string as the canonical name
		expect(canonicalize("Boccelism", canonical)).toBe('Bocce-lism');       // both → 'boccelism'
		expect(canonicalize("Gay Deboccery", canonical)).toBe('Gay De-Bocce-ry'); // both → 'gay deboccery'
		expect(canonicalize("The House of Bocce", canonical)).toBe('The House Of Bocce'); // both → 'the house of bocce'
	});

	it('matches exact canonical name case-insensitively', () => {
		expect(canonicalize("boccegenius", canonical)).toBe('boccegenius');
		expect(canonicalize("BOCCEGENIUS", canonical)).toBe('boccegenius');
	});

	it('returns name as-is when not found (and logs warning)', () => {
		const result = canonicalize("Unknown Team", canonical);
		expect(result).toBe('Unknown Team');
	});
});
