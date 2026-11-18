export const SITE_NAME = '#30DayMapChallenge Gallery';
export const REPO_URL = 'https://github.com/squidmaps-io/map-challenge-gallery';
export const CONTACT_EMAIL = 'support@squidmaps.io';
export const CONTACT_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('30DayMapChallenge gallery')}`;
export const SQUIDMAPS_HOME = 'https://squidmaps.io/';
export const SQUIDMAPS_URL = 'https://squidmaps.io/?utm_source=30daymap-gallery';
export const CHALLENGE_URL = 'https://30daymapchallenge.com/';
export const CHALLENGE_FOUNDER = { name: 'Topi Tjukanov', url: 'https://tjukanov.org/' };
export const YEAR = 2026;
export const LOCALE = 'en';

/** Prefix a site-relative path with the configured base path. */
export const withBase = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;

/** Absolute URL for a site-relative path, using the configured site origin and base path. */
export const absUrl = (p: string) => new URL(withBase(p), import.meta.env.SITE).href;

/** Calendar date of a challenge day, e.g. "3 November 2026". */
export const dayDate = (day: number) =>
  new Date(Date.UTC(YEAR, 10, day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** ISO date of a challenge day, e.g. "2026-11-03". */
export const dayIso = (day: number) => new Date(Date.UTC(YEAR, 10, day)).toISOString().slice(0, 10);
