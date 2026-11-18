/**
 * Add a single post by URL (works for X, LinkedIn, Threads, Bluesky and Mastodon).
 *
 *   npm run add -- https://x.com/someone/status/123 --day 4
 *   npm run add -- <url> <url> <url>          (day is detected from the post text)
 */
import { allStoredKeys, blocklist, loadEnv, mergeIntoDay } from './lib/store.ts';
import { classifyDay } from './lib/classify.ts';
import { toPost } from './lib/post.ts';
import { resolveUrl } from './lib/resolve.ts';
import { dedupeDay } from './lib/dedupe.ts';

loadEnv();

const args = process.argv.slice(2);
const dayIdx = args.indexOf('--day');
const forcedDay = dayIdx >= 0 ? Number(args[dayIdx + 1]) : null;
const urls = args.filter((a, i) => /^https?:\/\//.test(a) && (dayIdx < 0 || i !== dayIdx + 1));

if (!urls.length) {
  console.error('Usage: npm run add -- <post url> [more urls…] [--day N]');
  process.exit(1);
}

const stored = allStoredKeys();
const blocked = blocklist();
let failures = 0;

for (const url of urls) {
  try {
    const c = await resolveUrl(url);
    if (stored.has(c.id) || stored.has(c.url)) {
      console.log(`= already in gallery: ${c.url}`);
      continue;
    }
    if (blocked.has(c.id) || blocked.has(c.url)) {
      console.log(`× blocklisted: ${c.url}`);
      continue;
    }
    if (c.optedOut) throw new Error(`skipped: ${c.optedOut}`);
    if (!c.imageUrl) throw new Error('no image found on this post');
    const day = forcedDay ?? classifyDay(c.text, c.tags, c.postedAt);
    if (!day || day < 1 || day > 30) throw new Error('could not detect the day; pass --day N');
    const post = await toPost(c, day, 'manual');
    if ('skip' in post) throw new Error(`skipped: ${post.skip}`);
    mergeIntoDay(day, [post]);
    stored.add(c.id);
    const merged = await dedupeDay(day);
    console.log(`+ day ${day}: ${c.author.handle} (${c.platform}) ${c.url}${merged ? ' (merged with an existing cross-post)' : ''}`);
  } catch (e) {
    failures++;
    console.error(`! ${url}: ${(e as Error).message}`);
  }
}
process.exit(failures ? 1 : 0);
