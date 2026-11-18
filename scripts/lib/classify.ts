import { themes, YEAR } from './store.ts';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Hashtags people commonly use for each theme (in addition to the normalized theme name).
const EXTRA_TAGS: Record<number, string[]> = {
  5: ['sight', 'sensessight'],
  7: ['10minutemap', 'tenminutemap'],
  9: ['urbanrural'],
  11: ['sound', 'sensessound'],
  14: ['borges', 'borgesian'],
  17: ['lightanddark', 'lightdark'],
  19: ['smell', 'sensessmell'],
  21: ['osm', 'openstreetmap'],
  23: ['taste', 'sensestaste'],
  25: ['isthisamap'],
  27: ['newtool'],
  28: ['feeling', 'sensesfeeling'],
  30: ['penandpaper', 'penpaper'],
};

let tagIndex: Map<string, number> | null = null;
function themeTags() {
  if (tagIndex) return tagIndex;
  tagIndex = new Map();
  for (const { day, theme } of themes()) {
    tagIndex.set(norm(theme), day);
    for (const t of EXTRA_TAGS[day] ?? []) tagIndex.set(t, day);
  }
  // "null" is too ambiguous as a hashtag on its own; keep it but it only counts alongside other signals.
  return tagIndex;
}

const PATTERNS = [
  /\bday\s*[#:\-]?\s*0?(\d{1,2})\b/i, // "Day 3", "day #3", "Day03", "#Day3"
  /\b(\d{1,2})\s*\/\s*30\b/, // "3/30"
  /\b(\d{1,2})(?:st|nd|rd|th)\s+day\b/i, // "3rd day"
];

/** The challenge day a post was published on (UTC, so up to a day off for distant timezones). */
function postedDay(postedAt: string): number | null {
  const d = new Date(postedAt);
  if (d.getUTCMonth() === 10) return d.getUTCDate();
  if (d.getUTCMonth() > 10 || d.getUTCFullYear() > YEAR) return 31; // after the challenge: any day is in the past
  return 0; // before November
}

/**
 * Work out which challenge day a post belongs to.
 * Returns null if it can't be determined with reasonable confidence.
 *
 * Explicit day text ("Day 10") is trusted even if posted early or late: people do work ahead and catch up.
 * A match from a theme hashtag alone is weaker, because tags like #OpenStreetMap are used all month,
 * so when `postedAt` is given it only counts if the post went up between a day before and three days
 * after that theme's day.
 */
export function classifyDay(text: string, tags: string[] = [], postedAt?: string): number | null {
  const posted = postedAt ? postedDay(postedAt) : null;

  // Strip the challenge hashtag itself so "30DayMapChallenge" can't match "day".
  const clean = text.replace(/#?30\s*day\s*map\s*challenge\w*/gi, ' ');
  for (const re of PATTERNS) {
    const m = clean.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 30) return n;
    }
  }
  // Fall back to theme hashtags, only when exactly one theme matches.
  const index = themeTags();
  const allTags = new Set([
    ...tags.map(norm),
    ...[...clean.matchAll(/#(\w+)/g)].map((m) => norm(m[1])),
  ]);
  const days = new Set<number>();
  for (const t of allTags) {
    const d = index.get(t);
    if (d && t !== 'null') days.add(d);
  }
  if (days.size !== 1) return null;
  const day = [...days][0];
  if (posted !== null && (day > posted + 1 || day < posted - 3)) return null;
  return day;
}
