// Flags (decisions D7 and D8). Ids come from config\flags.js. A flag that needs the top-K stages is null outside
// the top-K (run.js sets it), never false. The functions here return true or false, except directionAmbiguityFlag,
// which is null when the cell has no q.
import { rateStats } from './rate.js';
import { countsIn } from './cell-counts.js';
import { stats } from '../../config/stats.js';

export function lowSampleFlag(n, cfg = stats) {
  return n < cfg.flagLowSample;
}

export function shortWindowFlag(days, cfg = stats) {
  return days <= cfg.shortWindowDays;
}

export function failsFdrFlag(q, cfg = stats) {
  return q === null || q >= cfg.alpha;
}

// Observed span of a label in days: last minus first observed day. Too short a span means the label is new.
export function newLabelFlag(p, e, o, cfg = stats) {
  const span = (id) => p.last[id] - p.first[id];
  return span(e) < cfg.newLabelDays || span(o) < cfg.newLabelDays;
}

// Autocorrelation (placeboP at or above the placebo alpha). Null when no placebo was run.
export function highAutocorrelationFlag(placeboP, cfg = stats) {
  return placeboP === null ? null : placeboP >= cfg.placebo.alpha;
}

// Recompute the cell without low-completeness start days. True when the direction changes, when either ratio
// is undefined, or when the ratio moves by more than ln(1 + lowCompletenessMaxChange).
// Direction ambiguity (D7): the reverse cell (outcome to exposure, same window) is kept with q below alpha and points
// the same way. Null when this cell has no q (not evaluated); false when the reverse cell is absent or not significant.
export function directionAmbiguityFlag(c, rev, cfg = stats) {
  if (c.q === null) return null;
  if (!rev || rev.q === null || rev.q >= cfg.alpha) return false;
  if (rev.rates.rr === null || c.rates.rr === null) return false;
  return (rev.rates.rr >= 1) === (c.rates.rr >= 1);
}

export function lowCompletenessFlag(p, e, masks, rr, cfg = stats) {
  const kept = new Uint8Array(p.n);
  for (let d = 0; d < p.n; d += 1) kept[d] = masks.evaluable[d] && !p.lowComp[d] ? 1 : 0;
  const c = countsIn(p, e, kept, masks.hit);
  const rr2 = rateStats(c.k, c.n, c.K, c.N).rr;
  if (rr === null || rr2 === null) return true;
  if ((rr2 >= 1) !== (rr >= 1)) return true;
  if (rr === 0 || rr2 === 0) return rr2 !== rr;
  return Math.abs(Math.log(rr2 / rr)) > Math.log(1 + cfg.lowCompletenessMaxChange);
}
