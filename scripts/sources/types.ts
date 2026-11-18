import type { Platform } from '../../src/lib/types.ts';

/** A post as found on a platform, before day classification. */
export interface Candidate {
  id: string;
  platform: Platform;
  url: string;
  author: { name: string; handle: string; avatar?: string };
  text: string;
  tags: string[];
  postedAt: string;
  imageUrl: string | null;
  imageCount: number;
  /** Set when the author has asked not to be shown like this; the value explains which setting. */
  optedOut?: string;
}

export const truncate = (s: string, n = 200) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
};

export const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
