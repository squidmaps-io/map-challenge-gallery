import { AtpAgent } from '@atproto/api';
import type { Candidate } from './types.ts';

const TAG = '30DayMapChallenge';

const hasLogin = () => !!(process.env.BSKY_HANDLE && process.env.BSKY_APP_PASSWORD);

let agentPromise: Promise<AtpAgent> | null = null;
export function bskyAgent(): Promise<AtpAgent> {
  if (!agentPromise) {
    agentPromise = (async () => {
      if (hasLogin()) {
        const agent = new AtpAgent({ service: 'https://bsky.social' });
        await agent.login({ identifier: process.env.BSKY_HANDLE!, password: process.env.BSKY_APP_PASSWORD! });
        return agent;
      }
      // Without a login, api.bsky.app allows a single page of the most recent results (no dates, no paging).
      return new AtpAgent({ service: 'https://api.bsky.app' });
    })();
  }
  return agentPromise;
}

/** Extract images from a post view's embed (images, record-with-media, video thumbnail, or link-card image). */
function images(embed: any): { url: string; count: number } | null {
  if (!embed) return null;
  const t: string = embed.$type ?? '';
  if (t.startsWith('app.bsky.embed.images')) {
    // `thumb` is Bluesky's small rendition, ideal for grid tiles.
    return embed.images?.length ? { url: embed.images[0].thumb ?? embed.images[0].fullsize, count: embed.images.length } : null;
  }
  if (t.startsWith('app.bsky.embed.recordWithMedia')) return images(embed.media);
  if (t.startsWith('app.bsky.embed.video') && embed.thumbnail) return { url: embed.thumbnail, count: 1 };
  // A shared link (e.g. to an interactive map) with a preview card: the card image is the map.
  if (t.startsWith('app.bsky.embed.external') && embed.external?.thumb) return { url: embed.external.thumb, count: 1 };
  return null;
}

export const BSKY_OPT_OUT =
  'This Bluesky account hides its posts from logged-out viewers (Settings → Moderation → Logged-out visibility).';

/** Bluesky users can ask that their content not be shown to logged-out visitors. */
export function bskyOptOut(author: any): string | undefined {
  return (author?.labels ?? []).some((l: any) => l.val === '!no-unauthenticated') ? BSKY_OPT_OUT : undefined;
}

export function bskyPostToCandidate(post: any): Candidate {
  const rkey = post.uri.split('/').pop();
  const rec = post.record ?? {};
  const facetTags: string[] = (rec.facets ?? [])
    .flatMap((f: any) => f.features ?? [])
    .filter((f: any) => f.$type === 'app.bsky.richtext.facet#tag')
    .map((f: any) => f.tag);
  const img = images(post.embed);
  return {
    optedOut: bskyOptOut(post.author),
    id: `bluesky:${post.uri}`,
    platform: 'bluesky',
    url: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
    author: {
      name: post.author.displayName || post.author.handle,
      handle: `@${post.author.handle}`,
      avatar: post.author.avatar,
    },
    text: rec.text ?? '',
    tags: [...facetTags, ...(rec.tags ?? [])],
    postedAt: new Date(rec.createdAt ?? post.indexedAt).toISOString(),
    imageUrl: img?.url ?? null,
    imageCount: img?.count ?? 0,
  };
}

export async function searchBluesky(since: Date, until: Date): Promise<Candidate[]> {
  const agent = await bskyAgent();
  if (!hasLogin()) {
    console.warn('  bluesky: no BSKY_HANDLE/BSKY_APP_PASSWORD in .env, so only the 100 most recent posts are reachable');
    const res = await agent.app.bsky.feed.searchPosts({ q: `#${TAG}`, sort: 'latest', limit: 100 });
    const inWindow = res.data.posts.map(bskyPostToCandidate).filter((c) => {
      const t = new Date(c.postedAt);
      return t >= since && t < until;
    });
    console.log(`  bluesky: ${inWindow.length} of ${res.data.posts.length} recent posts fall in the window`);
    return inWindow;
  }
  const out: Candidate[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const res = await agent.app.bsky.feed.searchPosts({
      q: `#${TAG}`,
      sort: 'latest',
      since: since.toISOString(),
      until: until.toISOString(),
      limit: 100,
      cursor,
    });
    for (const p of res.data.posts) out.push(bskyPostToCandidate(p));
    cursor = res.data.cursor;
    pages++;
    process.stdout.write(`\r  bluesky: ${out.length} posts (${pages} pages)`);
  } while (cursor && pages < 200);
  process.stdout.write('\n');
  return out;
}
