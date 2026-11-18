import type { Post } from '../../src/lib/types.ts';
import type { Candidate } from '../sources/types.ts';
import { truncate } from '../sources/types.ts';
import { fromHome } from '../sources/mastodon.ts';
import { probeImage } from './image.ts';

/**
 * Turn a classified candidate into a stored Post, or explain why it can't be included.
 * Mastodon posts are re-read from the author's home server first (stable images, authoritative opt-out).
 */
export async function toPost(c: Candidate, day: number, source: Post['source']): Promise<Post | { skip: string }> {
  if (c.platform === 'mastodon') {
    const home = await fromHome(c);
    if (home === 'deleted') return { skip: 'post was deleted' };
    if (home) c = { ...home, tags: c.tags.length ? c.tags : home.tags };
  }
  if (c.optedOut) return { skip: c.optedOut };
  if (!c.imageUrl) return { skip: 'no image found on this post' };
  const probe = await probeImage(c.imageUrl);
  if (!probe) return { skip: 'image could not be loaded' };
  return {
    id: c.id,
    platform: c.platform,
    url: c.url,
    author: c.author,
    text: truncate(c.text),
    postedAt: c.postedAt,
    day,
    image: c.imageUrl,
    color: probe.color,
    hash: probe.hash,
    imageCount: c.imageCount,
    source,
  };
}
