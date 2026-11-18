import type { Post, Theme } from './types';
import themesJson from '../../data/themes.json';

const files = import.meta.glob<Post[]>('../../data/posts/day-*.json', { eager: true, import: 'default' });

export const themes = themesJson as Theme[];

export function postsForDay(day: number): Post[] {
  const key = `../../data/posts/day-${String(day).padStart(2, '0')}.json`;
  return files[key] ?? [];
}

/** Only the fields the browser needs, to keep pages and JSON small. */
export function forClient(p: Post) {
  const { hash, mergedIds, source, day, ...rest } = p;
  return rest;
}

export function dayCounts(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const { day } of themes) counts[day] = postsForDay(day).length;
  return counts;
}

/** Days that have at least one map. Empty days render a "Coming soon" page that is kept out of search. */
export const publishedDays = () => themes.filter((t) => postsForDay(t.day).length > 0);

/** Number of distinct mapmakers among a set of posts. */
export const mapmakers = (posts: Post[]) => new Set(posts.map((p) => p.author.handle)).size;

/** Newest post time in a set of posts (used as an approximate last-modified date). */
export const newest = (posts: Post[]) => posts.reduce<string | undefined>((m, p) => (!m || p.postedAt > m ? p.postedAt : m), undefined);

/** All posts across the challenge. */
export const allPosts = () => themes.flatMap((t) => postsForDay(t.day));
