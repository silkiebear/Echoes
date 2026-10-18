// Stratum geometry and the autocorrelation inputs of the stratified test (phase 4b, D12 and D14). Built once per scan
// (geometry and label inputs) or once per (outcome, window) pair (outcome input).
// Simplification (D14, stated): the outcome input uses all evaluable days of the pair, not only the days of one
// exposure's active period.
import { withinStratumLagOne } from './stratified.js';
import { dailyVolumes } from './day-volume.js';

// Number of bands per block (phase 4d, option B). 'blocks' is the 4b method: one band, the index is the block.
export function stratumBands(strataCfg) {
  if (strataCfg.mode === 'blocks' || !(strataCfg.intensityBands > 1)) return 1;
  return strataCfg.intensityBands;
}

// index[d] is the stratum of day d: blocks of `days` from the first observed day, times the number of bands, plus the
// day's band. -1 before the first observed day. With bands above 1, the observed days of each block are ranked by their
// number of distinct labels (ties by day) and split into equal-count bands, lowest volume first. scratch holds the
// per-cell arrays that restrictedCell reuses, so no arrays are allocated per cell.
export function strataGeometry(p, days, bands = 1) {
  let base = -1;
  for (let t = 0; t < p.n; t += 1) {
    if (p.observed[t]) {
      base = t;
      break;
    }
  }
  const index = new Int32Array(p.n).fill(-1);
  let blocks = 0;
  if (base >= 0) {
    for (let t = base; t < p.n; t += 1) index[t] = Math.floor((t - base) / days) * bands;
    blocks = Math.floor((p.n - 1 - base) / days) + 1;
    if (bands > 1) assignBands(p, index, base, days, blocks, bands);
  }
  const count = blocks * bands;
  const size = count + 1;
  const scratch = {
    ns: new Int32Array(size), ks: new Int32Array(size), NN: new Int32Array(size), KK: new Int32Array(size),
  };
  return { base, days, bands, blocks, index, count, scratch };
}

function assignBands(p, index, base, days, blocks, bands) {
  const volumes = dailyVolumes(p);
  for (let bl = 0; bl < blocks; bl += 1) {
    const start = base + bl * days;
    const end = Math.min(p.n, start + days);
    const observed = [];
    for (let t = start; t < end; t += 1) if (p.observed[t]) observed.push(t);
    observed.sort((a, b) => volumes[a] - volumes[b] || a - b);
    const m = observed.length;
    observed.forEach((t, rank) => {
      index[t] = bl * bands + Math.floor((rank * bands) / m);
    });
  }
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
