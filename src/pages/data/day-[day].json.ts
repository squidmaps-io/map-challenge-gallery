import type { APIRoute } from 'astro';
import { forClient, postsForDay, themes } from '../../lib/data';

export function getStaticPaths() {
  return themes.map(({ day }) => ({ params: { day: String(day) } }));
}

export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(postsForDay(Number(params.day)).map(forClient)));
