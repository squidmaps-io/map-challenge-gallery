import type { APIRoute } from 'astro';
import { sitemapMarkdown } from '../lib/markdown';

export const GET: APIRoute = () => new Response(sitemapMarkdown(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
