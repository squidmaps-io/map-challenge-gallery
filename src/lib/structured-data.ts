/**
 * Schema.org JSON-LD for each page. Every property here mirrors something visible on the page
 * (titles, counts, author names, images, links); nothing is added only for search engines.
 */
import type { Post, Theme } from './types';
import { PLATFORM_LABELS } from './types';
import { CHALLENGE_FOUNDER, CHALLENGE_URL, CONTACT_EMAIL, LOCALE, SITE_NAME, SQUIDMAPS_HOME, YEAR, absUrl, dayIso } from './site';

const ORG_ID = `${SQUIDMAPS_HOME}#organization`;
const websiteId = () => `${absUrl('/')}#website`;
const pageId = (path: string) => `${absUrl(path)}#webpage`;

const organization = () => ({
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'squidmaps',
  url: SQUIDMAPS_HOME,
  logo: { '@type': 'ImageObject', url: absUrl('/brand/squidmaps-mascot.png') },
  email: CONTACT_EMAIL,
});

const website = (description: string) => ({
  '@type': 'WebSite',
  '@id': websiteId(),
  url: absUrl('/'),
  name: SITE_NAME,
  description,
  inLanguage: LOCALE,
  publisher: { '@id': ORG_ID },
});

/** The challenge itself, run by its community and founder (not by this site). */
const challenge = () => ({
  '@type': 'Thing',
  name: `#30DayMapChallenge ${YEAR}`,
  url: CHALLENGE_URL,
  description: 'A daily social mapping challenge held every November, with one theme per day.',
});

const breadcrumbs = (path: string, items: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  '@id': `${absUrl(path)}#breadcrumb`,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absUrl(it.path) })),
});

const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });

export function homeJsonLd(opts: { description: string; days: (Theme & { count: number })[] }) {
  return graph(
    organization(),
    website(opts.description),
    {
      '@type': 'CollectionPage',
      '@id': pageId('/'),
      url: absUrl('/'),
      name: `${SITE_NAME} ${YEAR}`,
      description: opts.description,
      inLanguage: LOCALE,
      isPartOf: { '@id': websiteId() },
      publisher: { '@id': ORG_ID },
      about: challenge(),
      hasPart: opts.days
        .filter((d) => d.count > 0)
        .map((d) => ({ '@type': 'CollectionPage', '@id': pageId(`/day/${d.day}/`), url: absUrl(`/day/${d.day}/`), name: `Day ${d.day}: ${d.theme}` })),
    },
  );
}

export function dayJsonLd(opts: { day: number; theme: string; description: string; posts: Post[] }) {
  const path = `/day/${opts.day}/`;
  return graph(
    organization(),
    website(opts.description),
    {
      '@type': 'CollectionPage',
      '@id': pageId(path),
      url: absUrl(path),
      name: `Day ${opts.day}: ${opts.theme}`,
      description: opts.description,
      inLanguage: LOCALE,
      isPartOf: { '@id': websiteId() },
      publisher: { '@id': ORG_ID },
      about: { ...challenge(), name: `#30DayMapChallenge ${YEAR}, day ${opts.day}: ${opts.theme}` },
      temporalCoverage: dayIso(opts.day),
      breadcrumb: { '@id': `${absUrl(path)}#breadcrumb` },
      mainEntity: {
        '@type': 'ItemList',
        name: `Maps for day ${opts.day}: ${opts.theme}`,
        numberOfItems: opts.posts.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: opts.posts.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SocialMediaPosting',
            url: p.url,
            image: p.image,
            author: { '@type': 'Person', name: p.author.name, alternateName: p.author.handle },
            publisher: { '@type': 'Organization', name: PLATFORM_LABELS[p.platform] },
          },
        })),
      },
    },
    breadcrumbs(path, [
      { name: 'Calendar', path: '/' },
      { name: `Day ${opts.day}: ${opts.theme}`, path },
    ]),
  );
}

export function aboutJsonLd(opts: { description: string }) {
  const path = '/about/';
  return graph(
    organization(),
    website(opts.description),
    {
      '@type': 'AboutPage',
      '@id': pageId(path),
      url: absUrl(path),
      name: `About the ${SITE_NAME}`,
      description: opts.description,
      inLanguage: LOCALE,
      isPartOf: { '@id': websiteId() },
      publisher: { '@id': ORG_ID },
      about: challenge(),
      // The page credits the challenge's founder by name and links to their site.
      mentions: [{ '@type': 'Person', name: CHALLENGE_FOUNDER.name, url: CHALLENGE_FOUNDER.url }],
      breadcrumb: { '@id': `${absUrl(path)}#breadcrumb` },
    },
    breadcrumbs(path, [
      { name: 'Calendar', path: '/' },
      { name: 'About', path },
    ]),
  );
}

/** Serialize for a <script type="application/ld+json"> tag without allowing "</script>" breakouts. */
export const jsonLdString = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');
