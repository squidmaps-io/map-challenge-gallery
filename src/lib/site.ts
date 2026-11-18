// Update these once the repo and domain are set up.
export const REPO_URL = 'https://github.com/squidmaps-io/map-challenge-gallery';
export const CONTACT_EMAIL = 'support@squidmaps.io';
export const CONTACT_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('30DayMapChallenge gallery')}`;
export const SQUIDMAPS_URL = 'https://squidmaps.io/?utm_source=30daymap-gallery';
export const CHALLENGE_URL = 'https://30daymapchallenge.com/';
export const YEAR = 2026;

/** Prefix a site-relative path with the configured base path. */
export const withBase = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
