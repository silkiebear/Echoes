// Placebo checks (decision D5). The exposure series is rotated by random offsets over the full day index. Shifted
// exposures on non-evaluable days are dropped; a shuffle with no exposure left is skipped. The observed rate ratio is
// compared with the shifted ones; the tail is the one matching the observed direction.
import { shiftOffsets, percentileRank, empiricalP } from './placebo.js';
import { stats } from '../../config/stats.js';

const NO_PLACEBO = { placeboP: null, placeboPercentile: null };

// masks: { evaluable, hit, N, K } for the cell's outcome and window. rr: observed rate ratio (null: no placebo).
export function placeboForCell(p, e, masks, rr, shuffles, rnd, minShift) {
  if (rr === null || p.n - 2 * minShift < 0) return NO_PLACEBO;
  const base = masks.K / masks.N;
  const values = [];
  for (const s of shiftOffsets(p.n, shuffles, minShift, rnd)) {
    let n = 0;
    let k = 0;
    for (const d of p.labelDays[e]) {
      const t = (d + s) % p.n;
      if (!masks.evaluable[t]) continue;
      n += 1;
      if (masks.hit[t]) k += 1;
    }
    if (n > 0) values.push((k / n) / base);
  }
  if (values.length === 0) return NO_PLACEBO;
  const dir = rr < 1 ? -1 : 1;
  const pe = empiricalP(dir * rr, values.map((v) => dir * v));
  return { placeboP: Math.min(1, 2 * pe), placeboPercentile: percentileRank(rr, values) };
}

// Rate of outcome o on day d+lag among exposed days (shifted by `shift`). Exposures land on observed days only.
function pointRate(p, days, o, lag, shift) {
  let n = 0;
  let hit = 0;
  for (const d0 of days) {
    const d = (d0 + shift) % p.n;
    const target = d + lag;
    if (!p.observed[d] || target >= p.n || !p.observed[target]) continue;
    n += 1;
    if (p.prefix[o][target + 1] - p.prefix[o][target] > 0) hit += 1;
  }
  return { n, rate: n ? hit / n : null };
}

function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  return sorted[Math.round(q * (sorted.length - 1))];
}

// Curve band (decision D5): per lag, the observed point-lag rate and the band of the same rate over shuffled exposures.
export function placeboBand(p, e, o, maxLag, shuffles, rnd, cfg = stats) {
  const offsets = shiftOffsets(p.n, shuffles, cfg.placebo.minShiftDays, rnd);
  const days = p.labelDays[e];
  const [qLo, qHi] = cfg.placebo.bandQuantiles;
  const out = [];
  for (let lag = 1; lag <= maxLag; lag += 1) {
    const observed = pointRate(p, days, o, lag, 0);
    const shifted = [];
    for (const s of offsets) {
      const r = pointRate(p, days, o, lag, s);
      if (r.n > 0) shifted.push(r.rate);
    }
    shifted.sort((a, b) => a - b);
    out.push({ lag, rate: observed.rate, lo: quantile(shifted, qLo), hi: quantile(shifted, qHi), n: observed.n });
  }
  return out;
}
