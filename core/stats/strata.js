// Stratum geometry and the autocorrelation inputs of the stratified test (phase 4b, D12 and D14). Built once per scan
// (geometry and label inputs) or once per (outcome, window) pair (outcome input).
// Simplification (D14, stated): the outcome input uses all evaluable days of the pair, not only the days of one
// exposure's active period.
import { withinStratumLagOne } from './stratified.js';

// index[d] is the stratum of day d (blocks of `days` from the first observed day, -1 before it). scratch holds the
// per-cell arrays that restrictedCell reuses, so no arrays are allocated per cell.
export function strataGeometry(p, days) {
  let base = -1;
  for (let t = 0; t < p.n; t += 1) {
    if (p.observed[t]) {
      base = t;
      break;
    }
  }
  const index = new Int32Array(p.n).fill(-1);
  let count = 0;
  if (base >= 0) {
    for (let t = base; t < p.n; t += 1) index[t] = Math.floor((t - base) / days);
    count = index[p.n - 1] + 1;
  }
  const size = count + 1;
  const scratch = {
    ns: new Int32Array(size), ks: new Int32Array(size), NN: new Int32Array(size), KK: new Int32Array(size),
  };
  return { base, days, index, count, scratch };
}

// Lag-1 correlation of each label's daily presence over observed days, within strata (D14: exposure input).
export function labelPhi(p, geo) {
  const observedDays = [];
  for (let t = 0; t < p.n; t += 1) if (p.observed[t]) observedDays.push(t);
  const out = new Float64Array(p.labelCount);
  for (let id = 0; id < p.labelCount; id += 1) {
    const flags = new Uint8Array(p.n);
    for (const t of p.labelDays[id]) flags[t] = 1;
    out[id] = withinStratumLagOne(flags, observedDays, geo.index);
  }
  return out;
}

// Lag-1 correlation of the outcome hit series over the evaluable days of one (outcome, window) pair (D14: outcome input).
export function outcomePhi(p, masks, geo) {
  const evaluableDays = [];
  for (let t = 0; t < p.n; t += 1) if (masks.evaluable[t]) evaluableDays.push(t);
  return withinStratumLagOne(masks.hit, evaluableDays, geo.index);
}
