/** Re-run cross-post merging on stored days: npm run dedupe [-- --days 1-5] */
import { dedupeDay } from './lib/dedupe.ts';

const spec = process.argv[process.argv.indexOf('--days') + 1];
const days = process.argv.includes('--days')
  ? spec.split(',').flatMap((p) => {
      const [a, b] = p.split('-').map(Number);
      return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i);
    })
  : Array.from({ length: 30 }, (_, i) => i + 1);
for (const d of days) {
  const n = await dedupeDay(d);
  if (n) console.log(`day ${d}: merged ${n} cross-posts`);
}
