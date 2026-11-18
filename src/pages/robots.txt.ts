import type { APIRoute } from 'astro';
import { absUrl } from '../lib/site';

// Everything is public. Markdown versions of each page are listed in /sitemap.md, and /llms.txt is a
// short guide for language-model clients; those are noted as comments only (they aren't robots directives).
export const GET: APIRoute = () =>
  new Response(
    [
      '# #30DayMapChallenge Gallery',
      `# Markdown versions of every page are listed at ${absUrl('/sitemap.md')}`,
      `# A guide for LLM clients is at ${absUrl('/llms.txt')}`,
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${absUrl('/sitemap.xml')}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
