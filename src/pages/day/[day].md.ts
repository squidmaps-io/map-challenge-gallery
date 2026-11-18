import type { APIRoute } from 'astro';
import { publishedDays } from '../../lib/data';
import { dayMarkdown } from '../../lib/markdown';

// Only days that have maps get a Markdown version (empty days are "coming soon" pages kept out of search).
export function getStaticPaths() {
  return publishedDays().map(({ day }) => ({ params: { day: String(day) } }));
}

export const GET: APIRoute = ({ params }) =>
  new Response(dayMarkdown(Number(params.day)), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
