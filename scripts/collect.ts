/**
 * Collect #30DayMapChallenge posts from Bluesky and Mastodon.
 *
 *   npm run collect -- --days 1-5
 *   npm run collect -- --days 18 --late 2
 *   npm run collect -- --days 6,7 --only bluesky
 *   npm run collect -- --recent 3       (everything posted in the last 3 days, for any challenge day: the daily job)
 *
 * With --days, posts are searched from the morning of the first day until `--late` days after the last day
 * (default 3). With --recent, the window is simply the last N days of posting, so catch-up posts
 * ("Day 3" posted on Nov 18) are picked up too. Posts are assigned to a day from their text, given a
 * placeholder color, and merged into data/posts/day-XX.json. Images aren't stored. Safe to re-run.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Post } from '../src/lib/types.ts';
import { allStoredKeys, blocklist, dayFile, loadEnv, mergeIntoDay, OUT_DIR, YEAR } from './lib/store.ts';
import { classifyDay } from './lib/classify.ts';
import { pool } from './lib/image.ts';
import { toPost } from './lib/post.ts';
import { dedupeDay } from './lib/dedupe.ts';
import { searchBluesky } from './sources/bluesky.ts';
import { searchMastodon } from './sources/mastodon.ts';
import { truncate, type Candidate } from './sources/types.ts';

loadEnv();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function parseDays(spec: string): number[] {
  const days = new Set<number>();
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-').map(Number);
    for (let d = a; d <= (b || a); d++) if (d >= 1 && d <= 30) days.add(d);
  }
  return [...days].sort((x, y) => x - y);
}

const recent = arg('recent') ? Number(arg('recent')) : null;
const days = recent ? Array.from({ length: 30 }, (_, i) => i + 1) : parseDays(arg('days') ?? '');
if (!days.length || (recent !== null && !(recent > 0))) {
  console.error('Usage: npm run collect -- --days 1-5 [--late 3] [--only bluesky|mastodon]   or   --recent 3');
  process.exit(1);
}
const late = Number(arg('late') ?? 3);
const only = arg('only');

// Nov 1 starts in the earliest timezone (UTC+14) and runs through the latest (UTC-12).
const challengeStart = Date.UTC(YEAR, 10, 1) - 14 * 3600_000;
const since = recent
  ? new Date(Math.max(challengeStart, Date.now() - recent * 86400_000))
  : new Date(Date.UTC(YEAR, 10, days[0], 0) - 14 * 3600_000);
const until = recent
  ? new Date()
  : new Date(Math.min(Date.now(), Date.UTC(YEAR, 10, days[days.length - 1] + 1 + late, 12)));
if (since >= until) {
  console.log('Nothing to collect in this window.');
  process.exit(0);
}
console.log(
  `Collecting ${recent ? `posts from the last ${recent} days (any challenge day)` : `days ${days.join(', ')}`} — ${since.toISOString()} to ${until.toISOString()}`,
);

const candidates: Candidate[] = [];
if (!only || only === 'bluesky') {
  try {
    candidates.push(...(await searchBluesky(since, until)));
  } catch (e) {
    console.warn(`  bluesky failed: ${(e as Error).message}`);
  }
}
if (!only || only === 'mastodon') candidates.push(...(await searchMastodon(since, until)));

const blocked = blocklist();
const stored = allStoredKeys();
const wanted = new Set(days);
const seen = new Set<string>();
const unclassified: Candidate[] = [];
const toAdd: { c: Candidate; day: number }[] = [];
let noImage = 0;
let optedOut = 0;

for (const c of candidates) {
  if (seen.has(c.id) || blocked.has(c.id) || blocked.has(c.url) || stored.has(c.id) || stored.has(c.url)) continue;
  seen.add(c.id);
  if (c.optedOut) {
    optedOut++;
    continue;
  }
  if (!c.imageUrl) {
    noImage++;
    continue;
  }
  const day = classifyDay(c.text, c.tags, c.postedAt);
  if (day === null) unclassified.push(c);
  else if (wanted.has(day)) toAdd.push({ c, day });
}

console.log(
  `Found ${candidates.length} posts → ${toAdd.length} new for these days, ${unclassified.length} unclassified, ${noImage} without images, ${optedOut} skipped (author opted out).`,
);

let homeSkipped = 0;
const posts = await pool(toAdd, 6, async ({ c, day }) => {
  const r = await toPost(c, day, 'feed');
  if ('skip' in r) {
    homeSkipped++;
    return null;
  }
  return r;
});
if (homeSkipped) console.log(`  ${homeSkipped} skipped after checking the original post (opted out, deleted, or image unavailable)`);

const byDay = new Map<number, Post[]>();
for (const p of posts) if (p) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);
for (const d of days) {
  if (!byDay.has(d) && !fs.existsSync(dayFile(d))) continue; // don't create empty day files
  const added = mergeIntoDay(d, byDay.get(d) ?? []);
  const merged = await dedupeDay(d);
  if (added || merged || !recent) console.log(`  day ${d}: +${added}${merged ? ` (${merged} cross-posts merged)` : ''}`);
}

if (candidates.length) {
fs.mkdirSync(OUT_DIR, { recursive: true });
const unclassifiedFile = path.join(OUT_DIR, 'unclassified.json');
fs.writeFileSync(
  unclassifiedFile,
  JSON.stringify(unclassified.map((c) => ({ url: c.url, text: truncate(c.text, 160) })), null, 2),
);
if (unclassified.length) console.log(`Review unclassified posts in ${path.relative(process.cwd(), unclassifiedFile)} (add with: npm run add -- <url> --day N)`);
}
