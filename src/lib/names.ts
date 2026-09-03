// Keys are normalize()-d strings; values are exact canonical names from the RANKINGS tab.
export const ALIASES: Record<string, string> = {
  // Truncated cell values (sheet columns too narrow for full name)
  "bachelors degree in": "Bachelor's Degree in Bocce",
  "bachelors degree in bocce": "Bachelor's Degree in Bocce",
  "flicking the pallino": "Flicking the Pallino",
  "florals for bocce": "Florals? For Bocce?",
  "goose shits and": "Goose Shits and Giggles",
  "goose shits and giggles": "Goose Shits and Giggles",
  "i wanna dance": "I Wanna Dance with Somebocce",
  "i wanna dance w": "I Wanna Dance with Somebocce",
  "i wanna dance with": "I Wanna Dance with Somebocce",
  "i wanna dance wsome bocce": "I Wanna Dance with Somebocce",
  "i wanna dance with some bocce": "I Wanna Dance with Somebocce",
  "i wanna dance with somebocce": "I Wanna Dance with Somebocce",
  "i wanna dance w somebocce": "I Wanna Dance with Somebocce",
  "irritable bocce": "Irritable Bocce Syndrome",
  "its bocce bitch": "It's Bocce, Bitch",
  "itty bitty bocce": "Itty Bitty Bocce Committee",
  "orange is the new": "Orange is the New Bocce",
  "orange is the new bocce": "Orange is the New Bocce",
  "professional ball": "Professional Ball Handlers",
  "professional ball handlers": "Professional Ball Handlers",
  "rolling with my": "Rolling with my Homos",
  "rolling with my homos": "Rolling with my Homos",
  "senorita busting": "Senorita Busting Balls",
  "senorita busting balls": "Senorita Busting Balls",
  "seniorita busting balls": "Senorita Busting Balls",
  "she doesnt even": "She Doesn't Even Throw Here",
  "she doesnt even throw": "She Doesn't Even Throw Here",
  "she doesnt even throw here": "She Doesn't Even Throw Here",
  "teeny weenie": "Teeny Weenie Pallinis",
  "thankful grateful": "Thankful Grateful Blessed",
  "thankful grateful blessed": "Thankful Grateful Blessed",
  "walter the bocce bunch": "Walter & the Bocce Bunch",
  "walter the bocce": "Walter & the Bocce Bunch",
  "walter and the bocce": "Walter & the Bocce Bunch",
  "walter and bocce bunch": "Walter & the Bocce Bunch",

  // Possible typos/misspellings
  "bangin and bumpin": "Bangin' and Bumpin'",
  "balls note included": "Balls Not Included",
  "deeped throwed it": "Deep Throwed It",
  "gay beboccery": "Gay De-Bocce-ry",
  "gay deboccery": "Gay De-Bocce-ry",
  "gay debocce ry": "Gay De-Bocce-ry",
  "irratable bocce syndrome": "Irritable Bocce Syndrome",
  "son of beocce": "Son of a Be-occe",
  "teeny weenies pallinis": "Teeny Weenie Pallinis",
};

export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalize(name: string, canonicalNames: string[]): string {
  const n = normalize(name);

  if (ALIASES[n]) {
    return ALIASES[n];
  }

  for (const canonical of canonicalNames) {
    if (normalize(canonical) === n) {
      return canonical;
    }
  }

  // Prefix match: handles arbitrary truncations from narrow sheet columns.
  // Requires 8+ normalized chars and a unique match to avoid false positives.
  if (n.length >= 8) {
    const prefixMatches = canonicalNames.filter((c) =>
      normalize(c).startsWith(n),
    );
    if (prefixMatches.length === 1) {
      return prefixMatches[0];
    }
  }

  // eslint-disable-next-line no-console
  console.warn(`[names] Unknown team name: "${name}"`);
  return name;
}
