/**
 * Markdown versions of the site's pages, plus /sitemap.md, /llms.txt and /llms-full.txt.
 * Generated at build time from the same data and shared copy as the HTML pages, so they stay in step.
 */
import type { Post } from './types';
import { PLATFORM_LABELS } from './types';
import { ABOUT, inlineMd } from './about-content';
import { allPosts, mapmakers, newest, postsForDay, publishedDays, themes } from './data';
import { CHALLENGE_URL, CONTACT_EMAIL, LOCALE, REPO_URL, SITE_NAME, SQUIDMAPS_URL, YEAR, absUrl, dayDate } from './site';

const MAINTAINER = `squidmaps (${CONTACT_EMAIL}); new posts are collected every 6 hours`;

/** Escape text taken from social posts so it can't break Markdown structure. */
const esc = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/([\\`*_[\]<>|])/g, '\\$1')
    .trim();

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Front matter-style header every page document carries. */
function header(title: string, opts: { canonical: string; purpose: string; updated?: string }) {
  return [
    `# ${title}`,
    '',
    `- Canonical page: ${opts.canonical}`,
    `- Language: ${LOCALE}`,
    `- Purpose: ${opts.purpose}`,
    opts.updated ? `- Content updated: ${opts.updated}` : null,
    `- Maintained by: ${MAINTAINER}`,
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export const markdownPaths = {
  home: '/index.md',
  about: '/about.md',
  day: (day: number) => `/day/${day}.md`,
};

export function homeMarkdown(): string {
  const posts = allPosts();
  const days = themes.map((t) => ({ ...t, posts: postsForDay(t.day) }));
  const lines = [
    header(`${SITE_NAME} ${YEAR}`, {
      canonical: absUrl('/'),
      purpose: 'Overview of the gallery: every day of the challenge, its theme, and how many maps it has',
      updated: newest(posts),
    }),
    `The [#30DayMapChallenge](${CHALLENGE_URL}) is a mapping challenge held every November, with a new theme each day. This gallery has ${posts.length.toLocaleString('en-US')} maps by ${mapmakers(posts).toLocaleString('en-US')} mapmakers, collected from public posts on Bluesky and Mastodon.`,
    '',
    `How maps are chosen, which platforms are included and why, and how privacy settings are respected: [About](${absUrl(markdownPaths.about)}).`,
    '',
    '## Days and themes',
    '',
    '| Day | Date | Theme | Maps | Gallery |',
    '| --- | --- | --- | --- | --- |',
    ...days.map(
      (d) =>
        `| ${d.day} | ${dayDate(d.day)} | ${esc(d.theme)} | ${d.posts.length} | ${
          d.posts.length ? `[Markdown](${absUrl(markdownPaths.day(d.day))}) · [page](${absUrl(`/day/${d.day}/`)})` : 'No maps yet'
        } |`,
    ),
    '',
  ];
  return lines.join('\n');
}

export function aboutMarkdown(): string {
  const lines = [
    header(ABOUT.heading, { canonical: absUrl('/about/'), purpose: ABOUT.description }),
    inlineMd(ABOUT.intro),
    '',
  ];
  for (const s of ABOUT.sections) {
    lines.push(`## ${s.heading}`, '');
    if (s.lead) lines.push(inlineMd(s.lead), '');
    if (s.steps) lines.push(...s.steps.map(([t, b], i) => `${i + 1}. **${t}** ${b}`), '');
    if (s.points) lines.push(...s.points.map(([t, b]) => `- **${t}** ${b}`), '');
    for (const p of s.after ?? []) lines.push(inlineMd(p), '');
    if (s.note) lines.push(inlineMd(s.note), '');
  }
  return lines.join('\n');
}

function postMarkdown(p: Post, i: number): string {
  const also = (p.alsoOn ?? []).map((l) => `[${PLATFORM_LABELS[l.platform]}](${l.url})`);
  return [
    `${i + 1}. **${esc(p.author.name)}** (${esc(p.author.handle)}), ${PLATFORM_LABELS[p.platform]}, ${date(p.postedAt)}: [original post](${p.url})${
      also.length ? `; also on ${also.join(', ')}` : ''
    }`,
    `   - Post text (excerpt): ${esc(p.text) || '(no text)'}`,
    `   - Map image: [view](${p.image})${p.imageCount > 1 ? ` (first of ${p.imageCount} images)` : ''}`,
  ].join('\n');
}

export function dayMarkdown(day: number): string {
  const { theme } = themes.find((t) => t.day === day)!;
  const posts = postsForDay(day);
  const people = mapmakers(posts);
  return [
    header(`Day ${day}: ${theme} (#30DayMapChallenge ${YEAR})`, {
      canonical: absUrl(`/day/${day}/`),
      purpose: `Every map collected for day ${day} of the #30DayMapChallenge ${YEAR}, theme "${theme}"`,
      updated: newest(posts),
    }),
    `${posts.length} ${posts.length === 1 ? 'map' : 'maps'} by ${people} ${people === 1 ? 'mapmaker' : 'mapmakers'} for day ${day} of the #30DayMapChallenge ${YEAR} (${dayDate(day)}), theme "${theme}", collected from public posts on Bluesky and Mastodon. Each entry links to the original post; maps belong to their creators.`,
    '',
    `Other days: [overview of all days](${absUrl(markdownPaths.home)}).`,
    '',
    '## Maps',
    '',
    ...posts.map(postMarkdown),
    '',
  ].join('\n');
}

/** Every page that has a Markdown version, in site order. */
export function markdownInventory() {
  return [
    { title: `${SITE_NAME} ${YEAR}`, page: '/', md: markdownPaths.home, topic: 'Overview', purpose: 'All 30 days with their themes and map counts' },
    { title: 'About', page: '/about/', md: markdownPaths.about, topic: 'About and policies', purpose: 'How maps are included, why only Bluesky and Mastodon, privacy and removal' },
    ...publishedDays().map((t) => ({
      title: `Day ${t.day}: ${t.theme}`,
      page: `/day/${t.day}/`,
      md: markdownPaths.day(t.day),
      topic: 'Daily galleries',
      purpose: `${postsForDay(t.day).length} maps for the theme "${t.theme}" (${dayDate(t.day)})`,
    })),
  ];
}

export function sitemapMarkdown(): string {
  const inv = markdownInventory();
  const topics = [...new Set(inv.map((i) => i.topic))];
  const empty = themes.filter((t) => postsForDay(t.day).length === 0);
  const lines = [
    `# Content map: ${SITE_NAME} ${YEAR}`,
    '',
    `Every page on ${absUrl('/')} that has content, with its Markdown version. Language: ${LOCALE}. Maintained by: ${MAINTAINER}.`,
    '',
  ];
  for (const topic of topics) {
    lines.push(`## ${topic}`, '', '| Page | Markdown | What it answers |', '| --- | --- | --- |');
    for (const i of inv.filter((x) => x.topic === topic)) lines.push(`| [${esc(i.title)}](${absUrl(i.page)}) | [${i.md}](${absUrl(i.md)}) | ${esc(i.purpose)} |`);
    lines.push('');
  }
  if (empty.length) {
    lines.push(
      '## Days without maps yet',
      '',
      `${empty.map((t) => `Day ${t.day} (${esc(t.theme)})`).join(', ')}. These days have no maps in the gallery yet, so they have no Markdown version; their pages will fill in as people post.`,
      '',
    );
  }
  return lines.join('\n');
}

export function llmsTxt(): string {
  const posts = allPosts();
  return [
    `# ${SITE_NAME}`,
    '',
    `> A community gallery of maps made for the #30DayMapChallenge ${YEAR}, a mapping challenge held every November with a new theme each day. ${posts.length.toLocaleString('en-US')} maps so far, collected automatically from public Bluesky and Mastodon posts and grouped by day. Built and hosted by squidmaps.`,
    '',
    'The gallery only links to maps; each map belongs to its creator and lives on the original post. Accounts that opt out of search or logged-out visibility on their platform are excluded.',
    '',
    'If you are an LLM looking for site information, use the content map to locate the relevant topic and its linked Markdown answer.',
    "Use that document's cited sources and canonical page; if the requested information is absent, report that gap.",
    '',
    '## Primary resources',
    '',
    `- [Content map](${absUrl('/sitemap.md')}): every page with its Markdown version, grouped by topic`,
    `- [Overview of all days](${absUrl(markdownPaths.home)}): the 30 daily themes, dates and map counts, with links to each day's gallery`,
    `- [About the gallery](${absUrl(markdownPaths.about)}): how maps are included, why only Bluesky and Mastodon, privacy, and how to request removal`,
    '',
    '## Optional',
    '',
    `- [Full text of every page](${absUrl('/llms-full.txt')}): all Markdown documents in one file; large`,
    `- [Official #30DayMapChallenge site](${CHALLENGE_URL}): the challenge's rules and theme list, run by its organizers rather than this gallery`,
    `- [Source code](${REPO_URL}): how the gallery collects and publishes maps`,
    `- [squidmaps](${SQUIDMAPS_URL}): the mapping tool behind this gallery`,
    '',
  ].join('\n');
}

export function llmsFullTxt(): string {
  const docs = [homeMarkdown(), aboutMarkdown(), ...publishedDays().map((t) => dayMarkdown(t.day))];
  return [llmsTxt().trimEnd(), ...docs.map((d) => d.trimEnd())].join('\n\n---\n\n') + '\n';
}
