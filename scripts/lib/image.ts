/**
 * Images are not stored: tiles load them from the original platform. At collection time we fetch each
 * image once to confirm it loads, pick a placeholder color, and compute a small difference hash used to
 * spot cross-posts of the same map. Nothing is written to disk.
 */
import sharp from 'sharp';

const UA = 'Mozilla/5.0 (compatible; 30DayMapChallengeGallery/0.1)';

/** Fetch with a few retries on server errors and rate limits. */
async function download(url: string): Promise<Buffer> {
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      lastErr = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastErr = (e as Error).message;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error(lastErr);
}

/** Check that an image loads; return its dominant color and a 64-bit difference hash (hex). */
export async function probeImage(url: string): Promise<{ color: string; hash: string } | null> {
  try {
    const buf = await download(url);
    const img = sharp(buf).rotate();
    const { dominant } = await img.clone().stats();
    const px = await img.clone().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
    let h = 0n;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return { color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`, hash: h.toString(16).padStart(16, '0') };
  } catch (err) {
    console.warn(`  ! image unavailable ${url}: ${(err as Error).message}`);
    return null;
  }
}

/** Number of differing bits between two hex hashes. */
export function hamming(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) (n += Number(x & 1n)), (x >>= 1n);
  return n;
}

/** Run async tasks with limited concurrency. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx]);
      }
    }),
  );
  return results;
}
