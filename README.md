# #30DayMapChallenge Gallery

A community gallery of [#30DayMapChallenge](https://30daymapchallenge.com/) maps, collected automatically from public posts on **Bluesky** and **Mastodon**. Every tile links to the original post. Presented by [squidmaps](https://squidmaps.io).

## How maps are included

There's nothing to submit. A post is picked up when it:

1. is a public post on Bluesky or Mastodon,
2. uses `#30DayMapChallenge`,
3. says which day it's for: "Day 12", "#day12", "12/30", or the theme hashtag (`#hexagons`),
4. includes the map as an image.

Posts are skipped when the author has opted out:
- **Bluesky:** the account hides its posts from logged-out viewers.
- **Mastodon:** the account is set to hide from search engines or not to be featured in discovery.

A daily re-check also removes posts that were deleted or whose authors opted out later. Cross-posts on both platforms are merged into one tile.

**Why only these two platforms?** They have open APIs for public posts and clear opt-out settings, so a single simple rule keeps the gallery fair and easy to moderate. LinkedIn, X, Instagram and Threads don't offer open access to public posts. The site's About page has the full explanation.

**Missing a map, or want one removed?** Email support@squidmaps.io. Removals are handled by hand:
1. Add the post `id`/`url` to `data/blocklist.json`.
2. Delete the post from its day file.
3. Run `npm run dedupe`.

## Scripts

```sh
cp .env.example .env                    # Bluesky app password, needed for full search
npm run collect -- --days 1-5           # collect specific days
npm run collect -- --recent 3           # everything posted in the last 3 days, any challenge day (the daily job)
npm run recheck                         # drop deleted / opted-out posts, refresh image links
npm run add -- <post url> --day N       # one-off fix: add a Bluesky or Mastodon post by URL
npm run dedupe                          # re-merge cross-posts
```

- **Bluesky:** full-text search for `#30DayMapChallenge`.
- **Mastodon:** hashtag timelines on several large servers. Each server only sees posts federated to it, so adding servers widens coverage (`INSTANCES` in `scripts/sources/mastodon.ts`).
- **Unplaced posts:** posts whose day can't be detected from their text go to `scripts/out/unclassified.json`.

## Automation

- **`.github/workflows/collect.yml`** runs daily on GitHub's servers:
  1. Collects recent days.
  2. Re-checks stored posts.
  3. Commits any changes.
  4. Redeploys.
- **Required repository secrets:** `BSKY_HANDLE`, `BSKY_APP_PASSWORD`.
- Disable the workflow or slow it down after the challenge ends.
- **`.github/workflows/deploy.yml`** builds the static site and publishes it to GitHub Pages on every push to `main`. It detects the site's address from the Pages settings, so it works at `squidmaps-io.github.io/map-challenge-gallery/` or on a custom domain. To override, set the repository variables `SITE_URL` and `BASE_PATH`.
- **One-time setup:** in the repo's Settings → Pages, set Source to "GitHub Actions". Add the `BSKY_HANDLE` and `BSKY_APP_PASSWORD` secrets for the collect workflow.

## Developing

```sh
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

The site is built with Astro, React and Tailwind. Data lives in `data/posts/day-XX.json`, one file per day. Images aren't stored: tiles load them directly from Bluesky's image servers and from each author's home Mastodon server. Collection only records each image's link, a placeholder color, and a small fingerprint used to merge cross-posts.

| Path | What |
| --- | --- |
| `src/pages/index.astro` | Calendar overview |
| `src/pages/day/[day].astro` | One page per day |
| `src/pages/about.astro` | How it works, why these platforms, privacy |
| `src/components/Gallery.tsx` | Grid, platform filter, infinite scroll |
| `src/components/Calendar.astro` | Full and mini calendars |
| `scripts/collect.ts` | Hashtag collector |
| `scripts/recheck.ts` | Deleted / opted-out clean-up |
| `scripts/lib/classify.ts` | Day detection |

## Credits

Maps belong to their creators. The #30DayMapChallenge was started by [Topi Tjukanov](https://tjukanov.org/) ([challenge repo](https://github.com/tjukanovt/30DayMapChallenge)).
