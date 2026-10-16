// Time split (decision D6). The observed days are split at the median observed day. Each half recomputes the cell
// with only its own start days (the outcome may fall in either half). The split fails unless both halves have enough
// exposed days, point the same way as the full cell and reach the split alpha.
import { fisherTwoSided } from './exact.js';
import { rateStats } from './rate.js';
import { countsIn, restrictMask } from './cell-counts.js';
import { stats } from '../../config/stats.js';

// Day index of the median observed day; the first half is the days before it. Null when nothing is observed.
export function splitDay(p) {
  const observedDays = [];
  for (let t = 0; t < p.n; t += 1) if (p.observed[t]) observedDays.push(t);
  return observedDays.length ? observedDays[Math.floor(observedDays.length / 2)] : null;
}

// True when the cell fails the split (the flag failsTimeSplit).
export function timeSplitFails(p, e, masks, rr, cfg = stats) {
  const mid = splitDay(p);
  if (rr === null || mid === null) return true;
  const up = rr >= 1;
  const halves = [[0, mid], [mid, p.n]];
  return !halves.every(([from, to]) => {
    const c = countsIn(p, e, restrictMask(masks.evaluable, from, to), masks.hit);
    const r = rateStats(c.k, c.n, c.K, c.N);
    if (c.n < cfg.timeSplit.minExposed || r.rr === null) return false;
    if ((r.rr >= 1) !== up) return false;
    return fisherTwoSided(c.k, c.n, c.K, c.N) < cfg.timeSplit.alpha;
  });
}
