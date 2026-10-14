// Time-of-day diversity: flags when most entries pile onto one clock time.
//
// A single most-common-minute share can hide concentration: a few hours may hold
// most entries while no individual minute dominates. The distinct-hours check
// catches that spread, so `low` requires either a hot minute OR too few hours.

const MINUTES_PER_HOUR = 60;

export function timeDiversity(entries, cfg) {
  const n = entries.length;

  if (n === 0) {
    return { n, topShare: 0, distinctHours: 0, low: false };
  }

  const minuteCounts = new Map();
  const hours = new Set();

  for (const entry of entries) {
    minuteCounts.set(entry.minutes, (minuteCounts.get(entry.minutes) || 0) + 1);
    hours.add(Math.floor(entry.minutes / MINUTES_PER_HOUR));
  }

  let topShare = 0;
  for (const count of minuteCounts.values()) {
    if (count > topShare) {
      topShare = count;
    }
  }
  topShare /= n;

  const distinctHours = hours.size;

  const low = n > 0 && (topShare > cfg.topShareMax || distinctHours < cfg.minDistinctHours);

  return { n, topShare, distinctHours, low };
}
