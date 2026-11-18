import type { Candidate } from './types.ts';
import { stripHtml } from './types.ts';

export const INSTANCES = [
  'mastodon.social',
  'en.osm.town',
  'fosstodon.org',
  'mapstodon.space',
  'mastodon.online',
  'hachyderm.io',
  'social.coop',
];
const TAG = '30DayMapChallenge';

/** Bridgy Fed mirrors Bluesky posts into the fediverse; point those back at the original Bluesky post. */
export function unbridge(c: Candidate): Candidate {
  const m = c.url.match(/^https:\/\/(?:fed|bsky)\.brid\.gy\/r\/(https:\/\/bsky\.app\/.+)$/);
  if (!m) return c;
  return { ...c, platform: 'bluesky', url: decodeURIComponent(m[1]), author: { ...c.author, handle: c.author.handle.replace(/@bsky\.brid\.gy$/, '') } };
}

export function statusToCandidate(s: any): Candidate {
  return unbridge(statusToCandidateRaw(s));
}

/** Mastodon accounts can opt out of search engines and of discovery features; posts can be non-public. */
export function mastodonOptOut(account: any, visibility = 'public'): string | undefined {
  if (visibility !== 'public') return `This post's visibility is "${visibility}", not public.`;
  if (account?.noindex === true)
    return 'This Mastodon account is set to hide from search engines (Preferences → Public profile → Privacy and reach).';
  if (account?.discoverable === false)
    return 'This Mastodon account is set not to be featured in discovery (Preferences → Public profile → Privacy and reach).';
  return undefined;
}

/**
 * The best image URL to load directly. Media of a post from another server is served from this server's
 * cache, which big servers purge after a while, so for remote media prefer the original on the author's
 * home server. `fromHome()` upgrades this to the home server's small preview.
 */
function mediaImage(m: any): string {
  if (m.type === 'image') return m.remote_url || m.preview_url || m.url;
  return m.preview_remote_url || m.preview_url;
}

function statusToCandidateRaw(s: any): Candidate {
  const media = (s.media_attachments ?? []).filter((m: any) => m.type === 'image' || m.type === 'gifv' || m.type === 'video');
  const acct: string = s.account.acct.includes('@')
    ? s.account.acct
    : `${s.account.acct}@${new URL(s.account.url).host}`;
  return {
    optedOut: mastodonOptOut(s.account, s.visibility),
    id: `mastodon:${s.uri}`,
    platform: 'mastodon',
    url: s.url ?? s.uri,
    author: { name: (s.account.display_name || '').replace(/:[\w+-]+:/g, '').trim() || s.account.username, handle: `@${acct}`, avatar: s.account.avatar_static },
    text: stripHtml(s.content ?? ''),
    tags: (s.tags ?? []).map((t: any) => t.name),
    postedAt: new Date(s.created_at).toISOString(),
    imageUrl: media.length ? mediaImage(media[0]) : null,
    imageCount: media.length,
  };
}

async function instanceTimeline(host: string, since: Date, until: Date): Promise<Candidate[]> {
  const out: Candidate[] = [];
  let maxId: string | undefined;
  for (let page = 0; page < 300; page++) {
    const u = new URL(`https://${host}/api/v1/timelines/tag/${TAG}`);
    u.searchParams.set('limit', '40');
    u.searchParams.set('only_media', 'true');
    if (maxId) u.searchParams.set('max_id', maxId);
    const res = await fetch(u);
    if (res.status === 429) {
      console.warn(`\n  ${host}: rate limited, waiting 60s`);
      await new Promise((r) => setTimeout(r, 60_000));
      page--;
      continue;
    }
    if (!res.ok) {
      console.warn(`\n  ${host}: HTTP ${res.status}, stopping`);
      break;
    }
    const statuses: any[] = await res.json();
    if (!statuses.length) break;
    for (const s of statuses) {
      const t = new Date(s.created_at);
      if (t >= since && t < until && !s.reblog) out.push(statusToCandidate(s));
    }
    maxId = statuses[statuses.length - 1].id;
    process.stdout.write(`\r  ${host}: ${out.length} posts in window (${page + 1} pages)`);
    if (new Date(statuses[statuses.length - 1].created_at) < since) break;
  }
  process.stdout.write('\n');
  return out;
}

export async function searchMastodon(since: Date, until: Date): Promise<Candidate[]> {
  const all: Candidate[] = [];
  for (const host of INSTANCES) {
    try {
      all.push(...(await instanceTimeline(host, since, until)));
    } catch (e) {
      console.warn(`  ${host}: ${(e as Error).message}`);
    }
  }
  return all;
}

/**
 * Re-fetch a post from its author's home server. That copy has stable, small preview images and the
 * account's own privacy settings (the authoritative opt-out check). Returns null when the home server
 * can't be asked (non-Mastodon software that requires a login, timeouts, …).
 */
export async function fromHome(c: Candidate): Promise<Candidate | null | 'deleted'> {
  const m = c.url.match(/^https:\/\/([^/]+)\/@[^/]+\/(?:statuses\/)?([0-9A-Za-z]+)\/?$/);
  if (!m) return null;
  try {
    const res = await fetch(`https://${m[1]}/api/v1/statuses/${m[2]}`);
    if (res.status === 404 || res.status === 410) return 'deleted';
    if (!res.ok) return null;
    return statusToCandidate(await res.json());
  } catch {
    return null;
  }
}
