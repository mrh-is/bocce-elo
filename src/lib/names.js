// Keys are normalize()-d strings; values are exact canonical names from the RANKINGS tab.
export const ALIASES = {
	// Truncated cell values (sheet columns too narrow for full name)
	'1 ball 2 balls': '1 Ball, 2 Balls, Red Balls, Blue Balls',
	'boccer i barely': 'Bocce-r? I barely know her!',
	'boccer i barely know': 'Bocce-r? I barely know her!',
	'i wanna dance': 'I Wanna Dance With Some Bocce',
	'i wanna dance w': 'I Wanna Dance With Some Bocce',
	'ingaysion of the': 'InGaysion of the Bocce Snatchers',
	'ingaysion of the bocce': 'InGaysion of the Bocce Snatchers',
	'itty bitty bocce': 'Itty Bitty Bocce Committee',
	'slobberknockin': 'Slobberknockin on Ediballs',
	'slobberknockin on': 'Slobberknockin on Ediballs',
	'teeny weenie': 'Teeny Weenie Pallinis',
	'walter and bocce bunch': 'Walter and the Bocce Bunch',
	'walter and the bocce': 'Walter and the Bocce Bunch',

	// Typos and misspellings found in match data
	'ball time high': 'Balltime High',
	'balls5eva': 'Ballz5Eva',
	'deeped throwed it': 'Deep Throwed It',
	'irratable bocce syndrome': 'Irritable Bocce Syndrome',
	'love is bocce field': 'Love is a Bocce Field',
	'resting bocce face': 'Resting Bocce Faces',
	'son of beocce': 'Son of a Be-occe',
	'teeny weenies pallinis': 'Teeny Weenie Pallinis',
	'throws of depair': 'Throws of Despair',

	// L&O variants: 'L&O: SHU' → 'lo shu', 'L & O: Special Homo Unit' → 'l o special homo unit'
	'lo shu': 'Lawn Order: Special Homo Unit',
	'lo special homo unit': 'Lawn Order: Special Homo Unit',
	'l o special homo unit': 'Lawn Order: Special Homo Unit',
	'lo pi': 'Lawn and Order: Pallina Intent',
	'lo pallina intent': 'Lawn and Order: Pallina Intent',
	'l o pallina intent': 'Lawn and Order: Pallina Intent',
};

export function normalize(name) {
	return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, ' ');
}

export function canonicalize(name, canonicalNames) {
	const n = normalize(name);

	if (ALIASES[n]) return ALIASES[n];

	for (const canonical of canonicalNames) {
		if (normalize(canonical) === n) return canonical;
	}

	console.warn(`[names] Unknown team name: "${name}"`);
	return name;
}
