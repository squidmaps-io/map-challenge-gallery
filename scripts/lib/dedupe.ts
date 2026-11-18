/**
 * Merge cross-posts: the same map shared on several platforms becomes one tile with `alsoOn` links.
 * Two posts on the same day are treated as the same map when their images are near-identical
 * (difference hash) or their text matches after stripping links, hashtags and mentions.
 */
import type { Post } from '../../src/lib/types.ts';
import { readDay, writeDay } from './store.ts';
import { hamming, pool, probeImage } from './image.ts';

/** The stored image hash, computing (and remembering) it if missing. */
async function hashOf(p: Post): Promise<string | null> {
  if (!p.hash) p.hash = (await probeImage(p.image))?.hash;
  return p.hash ?? null;
}

const textKey = (t: string) =>
  t
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#@]\S+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 60);

export async function dedupeDay(day: number): Promise<number> {
  const posts = readDay(day);
  if (posts.length < 2) return 0;
  const missing = posts.some((p) => !p.hash);
  const hashes = await pool(posts, 6, hashOf);
  // Original (non-bridged) posts win, then the earliest; other copies fold into it.
  const bridged = (p: Post) => /brid\.gy/.test(p.url + p.author.handle);
  const order = posts
    .map((_, i) => i)
    .sort((a, b) => Number(bridged(posts[a])) - Number(bridged(posts[b])) || posts[a].postedAt.localeCompare(posts[b].postedAt));
  const kept: number[] = [];
  const merged = new Set<number>();
  for (const i of order) {
    const p = posts[i];
    const key = textKey(p.text);
    const match = kept.find((k) => {
      const q = posts[k];
      if (q.platform === p.platform && q.author.handle !== p.author.handle) return false;
      const hk = hashes[k], hi = hashes[i];
      if (hk && hi && hamming(hk, hi) <= 5) return true;
      return key.length >= 30 && key === textKey(q.text);
    });
    if (match === undefined) {
      kept.push(i);
      continue;
    }
    const q = posts[match];
    const links = [...(q.alsoOn ?? [])];
    for (const l of [{ platform: p.platform, url: p.url }, ...(p.alsoOn ?? [])])
      if (l.url !== q.url && !links.some((x) => x.url === l.url)) links.push(l);
    q.alsoOn = links;
    q.mergedIds = [...new Set([...(q.mergedIds ?? []), p.id, ...(p.mergedIds ?? [])])];
    q.imageCount = Math.max(q.imageCount, p.imageCount);
    merged.add(i);
  }
  if (merged.size || missing) writeDay(day, posts.filter((_, i) => !merged.has(i)));
  return merged.size;
}
