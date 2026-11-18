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
