/**
 * Re-check stored posts against the platforms and drop anything that should no longer be shown:
 *   - posts that have been deleted (or whose account is gone)
 *   - authors who have since opted out (Bluesky "hide from logged-out viewers",
 *     Mastodon "hide from search engines" / "don't feature in discovery")
 * Cross-post copies (`alsoOn`) are checked too; if the main copy goes, a surviving copy takes its place.
 *
 *   npm run recheck
 */
import type { Post } from '../src/lib/types.ts';
import { readDay, writeDay } from './lib/store.ts';
import { pool, probeImage } from './lib/image.ts';
import { bskyPostToCandidate } from './sources/bluesky.ts';
import { statusToCandidate } from './sources/mastodon.ts';
import { truncate, type Candidate } from './sources/types.ts';

const BSKY = 'https://public.api.bsky.app/xrpc';

type Verdict = { ok: true; candidate?: Candidate } | { ok: false; reason: string } | { ok: 'unknown' };

async function getJson(url: string, tries = 3): Promise<{ status: number; body: any }> {
  for (let i = 0; ; i++) {
    const res = await fetch(url).catch(() => null);
    if (res && res.status === 429 && i < tries) {
      await new Promise((r) => setTimeout(r, 30_000));
      continue;
    }
    if (!res) {
      if (i < tries) continue;
      return { status: 0, body: null };
    }
    return { status: res.status, body: res.ok ? await res.json() : null };
  }
}

// ---- Bluesky --------------------------------------------------------------------------------

/** Parse a Bluesky post reference from a stored id ("bluesky:at://did/…/rkey") or a bsky.app URL. */
function bskyRef(idOrUrl: string): { actor: string; rkey: string } | null {
  const at = idOrUrl.match(/at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)/);
  if (at) return { actor: at[1], rkey: at[2] };
  const web = idOrUrl.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/);
  return web ? { actor: decodeURIComponent(web[1]), rkey: web[2] } : null;
}

async function checkBluesky(keys: string[]): Promise<Map<string, Verdict>> {
  const verdicts = new Map<string, Verdict>();
  const refs = new Map(keys.map((k) => [k, bskyRef(k)]));
  const actors = [...new Set([...refs.values()].filter(Boolean).map((r) => r!.actor))];

  // 1. Profiles: map handle/did → did, and catch deleted accounts.
  const didOf = new Map<string, string>();
  for (let i = 0; i < actors.length; i += 25) {
    const u = new URL(`${BSKY}/app.bsky.actor.getProfiles`);
    actors.slice(i, i + 25).forEach((a) => u.searchParams.append('actors', a));
    const { body } = await getJson(u.href);
    if (!body) actors.slice(i, i + 25).forEach((a) => didOf.set(a, '?'));
    for (const p of body?.profiles ?? []) {
      didOf.set(p.did, p.did);
      didOf.set(p.handle, p.did);
    }
  }

  // 2. Posts: fetch by at-uri; anything not returned has been deleted.
  const uriOf = new Map<string, string>();
  for (const [k, r] of refs) {
    const did = r && didOf.get(r.actor);
    if (!r) verdicts.set(k, { ok: 'unknown' });
    else if (did === '?') verdicts.set(k, { ok: 'unknown' });
    else if (!did) verdicts.set(k, { ok: false, reason: 'account deleted or deactivated' });
    else uriOf.set(k, `at://${did}/app.bsky.feed.post/${r.rkey}`);
  }
  const uris = [...new Set(uriOf.values())];
  const found = new Map<string, any>();
  let failed = false;
  for (let i = 0; i < uris.length; i += 25) {
    const u = new URL(`${BSKY}/app.bsky.feed.getPosts`);
    uris.slice(i, i + 25).forEach((x) => u.searchParams.append('uris', x));
    const { body } = await getJson(u.href);
    if (!body) failed = true;
    for (const p of body?.posts ?? []) found.set(p.uri, p);
  }
  for (const [k, uri] of uriOf) {
    const post = found.get(uri);
    if (!post) verdicts.set(k, failed ? { ok: 'unknown' } : { ok: false, reason: 'post deleted' });
    else {
      const c = bskyPostToCandidate(post);
      verdicts.set(k, c.optedOut ? { ok: false, reason: 'opted out (Bluesky logged-out visibility)' } : { ok: true, candidate: c });
    }
  }
  return verdicts;
}

// ---- Mastodon -------------------------------------------------------------------------------

async function checkMastodon(urls: string[]): Promise<Map<string, Verdict>> {
  const verdicts = new Map<string, Verdict>();
  await pool(urls, 4, async (url) => {
    // Mastodon ("/@user/123") and GoToSocial ("/@user/statuses/01ABC…") style links.
    const m = url.match(/^https:\/\/([^/]+)\/@[^/]+\/(?:statuses\/)?([0-9A-Za-z]+)\/?$/);
    if (!m) return verdicts.set(url, { ok: 'unknown' });
    const { status, body } = await getJson(`https://${m[1]}/api/v1/statuses/${m[2]}`);
    if (status === 404 || status === 410) return verdicts.set(url, { ok: false, reason: 'post deleted' });
    if (!body) return verdicts.set(url, { ok: 'unknown' });
    const c = statusToCandidate(body);
    verdicts.set(url, c.optedOut ? { ok: false, reason: `opted out (${c.optedOut.split(' (')[0].replace(/^This Mastodon account is set /, '')})` } : { ok: true, candidate: c });
  });
  return verdicts;
}

// ---- Main -----------------------------------------------------------------------------------

const days = new Map<number, Post[]>();
for (let d = 1; d <= 30; d++) {
  const posts = readDay(d);
  if (posts.length) days.set(d, posts);
}

/** The key used to look up a link: Bluesky by at-uri id when we have it, otherwise by URL. */
const keyFor = (platform: string, id: string | undefined, url: string) => (platform === 'bluesky' && id?.startsWith('bluesky:at://') ? id : url);

const bskyKeys = new Set<string>();
const mastoUrls = new Set<string>();
for (const posts of days.values())
  for (const p of posts)
    for (const l of [{ platform: p.platform, url: p.url, id: p.id }, ...(p.alsoOn ?? [])] as { platform: string; url: string; id?: string }[]) {
      if (l.platform === 'bluesky') bskyKeys.add(keyFor('bluesky', l.id, l.url));
      else if (l.platform === 'mastodon') mastoUrls.add(l.url);
    }

console.log(`Checking ${bskyKeys.size} Bluesky and ${mastoUrls.size} Mastodon links…`);
const verdicts = new Map([...(await checkBluesky([...bskyKeys])), ...(await checkMastodon([...mastoUrls]))]);

const tally = new Map<string, number>();
const note = (platform: string, reason: string) => tally.set(`${platform}: ${reason}`, (tally.get(`${platform}: ${reason}`) ?? 0) + 1);
let unknown = 0;
let removedPosts = 0;
let promoted = 0;
let refreshed = 0;
let noImage = 0;

for (const [day, posts] of days) {
  const kept: Post[] = [];
  for (const p of posts) {
    const verdictOf = (platform: string, url: string, id?: string) => verdicts.get(keyFor(platform, id, url)) ?? ({ ok: 'unknown' } as Verdict);
    const main = verdictOf(p.platform, p.url, p.id);
    const others = (p.alsoOn ?? []).map((l) => ({ ...l, v: verdictOf(l.platform, l.url) }));

    for (const o of others) if (o.v.ok === false) note(o.platform, o.v.reason);
    if (main.ok === 'unknown') unknown++;
    for (const o of others) if (o.v.ok === 'unknown') unknown++;
    const survivors = others.filter((o) => o.v.ok !== false);

    if (main.ok !== false) {
      if (survivors.length !== others.length) p.alsoOn = survivors.map(({ platform, url }) => ({ platform, url }));
      if (p.alsoOn && !p.alsoOn.length) delete p.alsoOn;
      // Keep the image link current (e.g. Mastodon home-server previews), refreshing color + hash if it changed.
      const fresh = main.ok === true ? main.candidate?.imageUrl : null;
      if (fresh && fresh !== p.image) {
        const probe = await probeImage(fresh);
        if (probe) {
          p.image = fresh;
          p.color = probe.color;
          p.hash = probe.hash;
          refreshed++;
        }
      }
      if (!p.image) {
        noImage++;
        continue;
      }
      kept.push(p);
      continue;
    }

    note(p.platform, main.reason);
    // Promote a surviving cross-post copy (we have its fresh details only if it was verified).
    const next = survivors.find((o) => o.v.ok === true && o.v.candidate);
    if (!next || next.v.ok !== true || !next.v.candidate) {
      removedPosts++;
      continue;
    }
    const c = next.v.candidate;
    kept.push({
      ...p,
      id: c.id,
      platform: c.platform,
      url: c.url,
      author: c.author,
      text: truncate(c.text),
      postedAt: c.postedAt,
      image: c.imageUrl ?? p.image,
      mergedIds: [...new Set([...(p.mergedIds ?? []), p.id])].filter((x) => x !== c.id),
      alsoOn: survivors.filter((o) => o !== next).map(({ platform, url }) => ({ platform, url })),
    });
    if (!kept.at(-1)!.alsoOn!.length) delete kept.at(-1)!.alsoOn;
    promoted++;
  }
  if (kept.length !== posts.length || promoted || refreshed) writeDay(day, kept);
}

console.log(`Removed ${removedPosts} posts, promoted ${promoted} cross-post copies, refreshed ${refreshed} image links.`);
if (noImage) console.log(`  dropped ${noImage} posts with no image link (they'll be re-collected if still public)`);
for (const [k, n] of [...tally].sort()) console.log(`  ${k}: ${n}`);
if (unknown) console.log(`  (${unknown} links couldn't be checked right now and were kept)`);
