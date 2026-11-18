/**
 * Single source for the About page. The HTML page (src/pages/about.astro) and its Markdown version
 * (src/pages/about.md.ts) both render from this, so they can't drift apart.
 *
 * Text uses a tiny inline syntax: **bold** and [label](url). Use {CONTACT} for the contact email link.
 */
import { CHALLENGE_FOUNDER, CHALLENGE_URL, CONTACT_EMAIL, REPO_URL, SQUIDMAPS_URL, YEAR } from './site';

export interface AboutSection {
  id: string;
  heading: string;
  lead?: string;
  /** Numbered requirements: [title, detail] */
  steps?: [string, string][];
  /** Bulleted points: [bold lead-in, rest] */
  points?: [string, string][];
  after?: string[];
  note?: string;
}

export const ABOUT = {
  title: `About · #30DayMapChallenge ${YEAR} Gallery`,
  description:
    'How the #30DayMapChallenge gallery collects maps, why it only includes Bluesky and Mastodon, and how it respects privacy settings.',
  eyebrow: 'About',
  heading: 'A simple, open gallery of challenge maps',
  intro: `Every November, thousands of maps are shared for the [#30DayMapChallenge](${CHALLENGE_URL}), started by [${CHALLENGE_FOUNDER.name}](${CHALLENGE_FOUNDER.url}). They're scattered across feeds and gone in a scroll. This gallery collects them by day so you can browse every take on every theme. It's built and hosted by [squidmaps](${SQUIDMAPS_URL}) as a community resource.`,
  sections: [
    {
      id: 'included',
      heading: 'How to be included',
      lead: "There's nothing to submit. The gallery checks for new posts every 6 hours and picks a map up automatically when its post:",
      steps: [
        ['Is on Bluesky or Mastodon', 'and visible to everyone.'],
        ['Uses #30DayMapChallenge', 'in the post text.'],
        ['Says which day', 'such as "Day 12", "#day12", "12/30", or the theme hashtag, e.g. #hexagons.'],
        ['Includes the map as an image', 'The first image becomes the tile.'],
      ],
      note: 'Posting on both platforms is fine: cross-posts are merged into one tile that links to each copy.',
    },
    {
      id: 'why',
      heading: 'Why only Bluesky and Mastodon?',
      lead: "We wanted a gallery that's simple to run, fair to everyone, and respectful of people's choices. One clear rule does that better than a submission queue:",
      points: [
        ['Open, public data.', "Both platforms have free, documented APIs for public posts. There's no scraping, no paid access, and no logging in as someone else."],
        ['Clear privacy settings we can honor.', 'Both let people say "don\'t show my posts this way," and we can check that automatically (see below).'],
        ['Easy to moderate.', "Instead of reviewing a stream of submissions, we include whatever is public and tagged, and step in only when something's wrong. That keeps a free side project running."],
        ['Links that work for everyone.', 'Every tile opens the original post, and anyone can view it without an account.'],
      ],
      after: [
        "LinkedIn, X, Instagram and Threads don't offer open access to public posts for a project like this. We can't include them consistently or respectfully, so we don't include them at all. If you post there too, cross-post a copy to Bluesky or Mastodon to be included.",
      ],
    },
    {
      id: 'privacy',
      heading: 'Privacy and what we store',
      points: [
        ["We skip people who've opted out.", 'That means Bluesky accounts that hide their posts from logged-out viewers, and Mastodon accounts set to hide from search engines or to stay out of discovery. These settings are re-checked every day, so changing one takes effect within a day.'],
        ["We don't copy your images.", "Tiles load the picture straight from Bluesky or your Mastodon server. We only keep the link, the author's name and handle, and the start of the post text."],
        ['Deleted posts disappear here too.', "A deleted post's image stops loading right away, and the post is removed from the gallery within a day."],
        ['Maps belong to their creators.', "We're just pointing to them."],
      ],
    },
    {
      id: 'contact',
      heading: 'Missing a map, or want yours removed?',
      after: [
        "First check the list above. Most missing maps don't say which day they're for. If it still isn't showing up, or you'd like your work taken out of the gallery, email {CONTACT} with a link to the post and we'll sort it out by hand.",
      ],
      note: `The gallery is open source: see the code [on GitHub](${REPO_URL}).`,
    },
  ] satisfies AboutSection[],
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Render the inline syntax to HTML (links get the given class). */
export function inlineHtml(text: string, linkClass: string, contactUrl: string): string {
  return escapeHtml(text)
    .replace('{CONTACT}', `<a class="${linkClass}" href="${escapeHtml(contactUrl)}">${CONTACT_EMAIL}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => `<a class="${linkClass}" href="${url}">${label}</a>`);
}

/** Render the inline syntax to Markdown. */
export const inlineMd = (text: string) => text.replace('{CONTACT}', `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`);
