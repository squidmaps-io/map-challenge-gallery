import fs from 'node:fs';
import path from 'node:path';
import type { Post, Theme } from '../../src/lib/types.ts';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const DATA_DIR = path.join(ROOT, 'data');
export const POSTS_DIR = path.join(DATA_DIR, 'posts');
export const OUT_DIR = path.join(ROOT, 'scripts', 'out');

export const YEAR = 2026;

export function themes(): Theme[] {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'themes.json'), 'utf8'));
}

export function dayFile(day: number) {
  return path.join(POSTS_DIR, `day-${String(day).padStart(2, '0')}.json`);
}

export function readDay(day: number): Post[] {
  const f = dayFile(day);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
}

export function writeDay(day: number, posts: Post[]) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  posts.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  fs.writeFileSync(dayFile(day), JSON.stringify(posts, null, 2) + '\n');
}

/** Merge new posts into a day's file; existing entries (same id or url) are kept. Returns number added. */
export function mergeIntoDay(day: number, incoming: Post[]): number {
  const existing = readDay(day);
  const seen = new Set(existing.flatMap((p) => [p.id, p.url, ...(p.mergedIds ?? []), ...(p.alsoOn ?? []).map((l) => l.url)]));
  let added = 0;
  for (const p of incoming) {
    if (seen.has(p.id) || seen.has(p.url)) continue;
    existing.push(p);
    seen.add(p.id);
    seen.add(p.url);
    added++;
  }
  writeDay(day, existing);
  return added;
}

/** True if this post is already stored in any day file. */
export function allStoredKeys(): Set<string> {
  const keys = new Set<string>();
  for (let d = 1; d <= 30; d++)
    for (const p of readDay(d)) {
      keys.add(p.id);
      keys.add(p.url);
      for (const id of p.mergedIds ?? []) keys.add(id);
      for (const l of p.alsoOn ?? []) keys.add(l.url);
    }
  return keys;
}

export function blocklist(): Set<string> {
  const f = path.join(DATA_DIR, 'blocklist.json');
  return new Set(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []);
}

export function loadEnv() {
  const f = path.join(ROOT, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
