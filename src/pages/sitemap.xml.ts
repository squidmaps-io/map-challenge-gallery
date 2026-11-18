import type { APIRoute } from 'astro';
import { allPosts, newest, postsForDay, publishedDays } from '../lib/data';
import { absUrl } from '../lib/site';

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Canonical, indexable HTML pages only. Days without maps are "coming soon" pages marked noindex,
// so they're left out until they have content. lastmod is the newest post on the page (approximate).
export const GET: APIRoute = () => {
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: absUrl('/'), lastmod: newest(allPosts()) },
    { loc: absUrl('/about/') },
    ...publishedDays().map((t) => ({ loc: absUrl(`/day/${t.day}/`), lastmod: newest(postsForDay(t.day)) })),
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <!-- Markdown versions of these pages: ${absUrl('/sitemap.md')} · guide for LLM clients: ${absUrl('/llms.txt')} -->`,
    ...urls.map(
      (u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
