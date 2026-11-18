/**
 * Turn a single Bluesky or Mastodon post URL into a Candidate (used by `npm run add`).
 * Other platforms aren't supported: see the About page for why.
 */
import type { Candidate } from '../sources/types.ts';
import { bskyPostToCandidate } from '../sources/bluesky.ts';
import { statusToCandidate } from '../sources/mastodon.ts';

export const UNSUPPORTED = 'Only Bluesky and Mastodon posts are supported.';

export function detectPlatform(url: string): 'bluesky' | 'mastodon' | null {
  const u = new URL(url);
  if (u.hostname === 'bsky.app') return 'bluesky';
  if (/\/@[^/]+\/\d+/.test(u.pathname)) return 'mastodon';
  return null;
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function resolveBluesky(url: string): Promise<Candidate> {
  const m = new URL(url).pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/);
  if (!m) throw new Error('Unrecognized Bluesky post URL');
  let [, actor, rkey] = m;
  const api = 'https://public.api.bsky.app/xrpc';
  if (!actor.startsWith('did:')) {
    actor = (await getJson(`${api}/com.atproto.identity.resolveHandle?handle=${actor}`)).did;
  }
  const uri = `at://${actor}/app.bsky.feed.post/${rkey}`;
  const { posts } = await getJson(`${api}/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`);
  if (!posts?.length) throw new Error('Bluesky post not found (it may have been deleted)');
  return bskyPostToCandidate(posts[0]);
}

async function resolveMastodon(url: string): Promise<Candidate> {
  const u = new URL(url);
  const id = u.pathname.match(/\/@[^/]+\/(\d+)/)![1];
  const s = await getJson(`https://${u.host}/api/v1/statuses/${id}`);
  return statusToCandidate(s);
}

export async function resolveUrl(url: string): Promise<Candidate> {
  switch (detectPlatform(url)) {
    case 'bluesky':
      return resolveBluesky(url);
    case 'mastodon':
      return resolveMastodon(url);
    default:
      throw new Error(UNSUPPORTED);
  }
}
