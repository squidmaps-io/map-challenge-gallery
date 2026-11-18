import { siBluesky, siMastodon, siThreads, siX } from 'simple-icons';
import type { Platform } from '../lib/types';

// simple-icons no longer ships LinkedIn, so use a simple "in" glyph.
const LINKEDIN =
  'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z';

const PATHS: Record<Platform, string> = {
  bluesky: siBluesky.path,
  mastodon: siMastodon.path,
  x: siX.path,
  threads: siThreads.path,
  linkedin: LINKEDIN,
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  bluesky: '#1185fe',
  mastodon: '#6364ff',
  x: '#000000',
  threads: '#000000',
  linkedin: '#0a66c2',
};

export default function PlatformIcon({ platform, className = 'size-4' }: { platform: Platform; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={PATHS[platform]} />
    </svg>
  );
}
