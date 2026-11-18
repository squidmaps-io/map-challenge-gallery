import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClientPost as Post, Platform } from '../lib/types';
import { PLATFORM_LABELS } from '../lib/types';
import PlatformIcon from './PlatformIcon';

const PAGE = 48;

interface Props {
  initial: Post[];
  total: number;
  dataUrl: string;
}

export default function Gallery({ initial, total, dataUrl }: Props) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [platform, setPlatform] = useState<Platform | 'all'>('all');
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  // Fetch the full day once the page is idle (the first page is already in the HTML).
  useEffect(() => {
    if (total <= initial.length) return;
    let cancelled = false;
    fetch(dataUrl)
      .then((r) => r.json())
      .then((all: Post[]) => !cancelled && setPosts(all))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataUrl, total, initial.length]);

  const platformsOf = (p: Post) => [p.platform, ...(p.alsoOn ?? []).map((l) => l.platform)];
  const filtered = useMemo(
    () => (platform === 'all' ? posts : posts.filter((p) => platformsOf(p).includes(platform))),
    [posts, platform],
  );
  const visible = filtered.slice(0, limit);

  // Infinite scroll: reveal another page when the sentinel approaches the viewport.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setLimit((l) => l + PAGE),
      { rootMargin: '800px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const counts = useMemo(() => {
    const c: Partial<Record<Platform, number>> = {};
    for (const p of posts) for (const pl of new Set(platformsOf(p))) c[pl] = (c[pl] ?? 0) + 1;
    return c;
  }, [posts]);
  const platforms = (Object.keys(PLATFORM_LABELS) as Platform[]).filter((p) => counts[p]);

  return (
    <div>
      {platforms.length > 1 && (
        <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter maps by platform">
          <Chip active={platform === 'all'} onClick={() => (setPlatform('all'), setLimit(PAGE))}>
            All <span className="font-normal tabular-nums">{posts.length}</span>
          </Chip>
          {platforms.map((p) => (
            <Chip key={p} active={platform === p} onClick={() => (setPlatform(p), setLimit(PAGE))}>
              <PlatformIcon platform={p} className="size-3.5" /> {PLATFORM_LABELS[p]} <span className="font-normal tabular-nums">{counts[p]}</span>
            </Chip>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-2.5">
        {visible.map((p, i) => (
          <Tile key={p.id} post={p} eager={i < 8} />
        ))}
      </ul>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      <p role="status" className="sr-only">
        Showing {visible.length} of {filtered.length} maps
      </p>
      {visible.length < filtered.length && (
        <div className="py-8 text-center">
          {/* More load automatically while scrolling; the button is there for keyboard and switch users. */}
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Show more maps ({filtered.length - visible.length} more)
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'
      }`}
    >
      {children}
    </button>
  );
}

function Tile({ post, eager }: { post: Post; eager: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [avatarOk, setAvatarOk] = useState(true);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // The image may have finished (or failed) before React hydrated.
    const el = img.current;
    if (el?.complete) el.naturalWidth > 0 ? setLoaded(true) : setFailed(true);
  }, []);

  // Images load from the original platform; if one is gone (post deleted, server down), hide the tile.
  if (failed) return null;

  const others = (post.alsoOn ?? []).filter((l, i, a) => l.platform !== post.platform && a.findIndex((x) => x.platform === l.platform) === i);

  return (
    <li className="group relative">
      <a
        href={post.url}
        target="_blank"
        rel="noopener"
        className="relative block aspect-square overflow-hidden rounded-lg bg-zinc-200 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink-500 sm:rounded-xl dark:bg-zinc-800"
        style={{ backgroundColor: post.color }}
        title={post.text}
        aria-label={`Map by ${post.author.name} on ${PLATFORM_LABELS[post.platform]}: ${post.text} (opens in a new tab)`}
      >
        <img
          ref={img}
          src={post.image}
          alt=""
          width={480}
          height={480}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`size-full object-cover transition duration-500 group-hover:scale-[1.04] ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Always-visible platform badge */}
        <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm" title={PLATFORM_LABELS[post.platform]}>
          <PlatformIcon platform={post.platform} className="size-3.5" />
        </span>
        {post.imageCount > 1 && (
          <span className="absolute top-2 right-2 rounded-full bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            1/{post.imageCount}
          </span>
        )}

        {/* Hover / focus overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <p className="mb-2 line-clamp-3 text-xs leading-snug text-white/85">{post.text}</p>
          <div className="flex items-center gap-2">
            {post.author.avatar && avatarOk ? (
              <img src={post.author.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setAvatarOk(false)} className="size-7 shrink-0 rounded-full bg-white/20 object-cover" />
            ) : (
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">
                {post.author.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 text-white">
              <p className="truncate text-sm font-semibold leading-tight">{post.author.name}</p>
              <p className="truncate text-xs text-white/70">{post.author.handle}</p>
            </div>
          </div>
        </div>
      </a>

      {/* Cross-posts: links to the same map on other platforms (siblings of the main link, since links can't nest) */}
      {others.length > 0 && (
        <div className="absolute top-2 left-9 flex gap-1">
          {others.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener"
              title={`Also on ${PLATFORM_LABELS[l.platform]}`}
              aria-label={`Also on ${PLATFORM_LABELS[l.platform]} (opens in a new tab)`}
              className="grid size-6 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <PlatformIcon platform={l.platform} className="size-3.5" />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
