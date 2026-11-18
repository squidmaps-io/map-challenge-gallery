export type Platform = 'bluesky' | 'mastodon' | 'x' | 'linkedin' | 'threads';

export interface Post {
  /** Stable unique id, prefixed by platform, e.g. "bluesky:at://did:plc:…/app.bsky.feed.post/…" */
  id: string;
  platform: Platform;
  /** Link to the original post */
  url: string;
  author: {
    name: string;
    handle: string;
    avatar?: string;
  };
  /** First ~200 characters of the post text */
  text: string;
  postedAt: string;
  day: number;
  /** The first image, loaded directly from the platform (a small preview rendition where available) */
  image: string;
  /** Dominant color of the image, used as a placeholder while it loads */
  color?: string;
  /** 64-bit difference hash of the image (hex), used to spot cross-posts of the same map */
  hash?: string;
  imageCount: number;
  source: 'feed' | 'manual';
  /** The same map cross-posted on other platforms */
  alsoOn?: { platform: Platform; url: string }[];
  /** Ids of the cross-posts folded into this entry (so collectors don't re-add them) */
  mergedIds?: string[];
}

export interface Theme {
  day: number;
  theme: string;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  x: 'X',
  linkedin: 'LinkedIn',
  threads: 'Threads',
};

/** The subset of a Post sent to the browser. */
export type ClientPost = Omit<Post, 'hash' | 'mergedIds' | 'source' | 'day'>;
