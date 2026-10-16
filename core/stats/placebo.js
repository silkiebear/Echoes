// Placebo helpers: circular shifts of a day series, empirical p and percentile of an observed value against a
// placebo distribution, and random shift offsets. Pure functions; the random source is passed in (seeded by the caller).

// Rotates right by k. Any integer k works; empty input gives an empty array.
export function circularShift(series, k) {
  const n = series.length;
  if (n === 0) return [];
  const shift = ((k % n) + n) % n;
  return series.map((_, i) => series[(i - shift + n) % n]);
}

// One-sided empirical p with the usual +1 correction, so it is never zero.
export function empiricalP(observed, placebo) {
  let atLeast = 0;
  for (const v of placebo) if (v >= observed) atLeast += 1;
  return (1 + atLeast) / (1 + placebo.length);
}

// Mid-rank percentile: a tie counts half. Null when there is no placebo.
export function percentileRank(observed, placebo) {
  if (placebo.length === 0) return null;
  let below = 0;
  let equal = 0;
  for (const v of placebo) {
    if (v < observed) below += 1;
    else if (v === observed) equal += 1;
  }
  return (below + 0.5 * equal) / placebo.length;
}

// `count` offsets, each between minShift and D - minShift. Throws when that range is empty.
export function shiftOffsets(D, count, minShift, rnd) {
  if (D - 2 * minShift < 0 || count < 0) throw new RangeError('shift range is empty or count is negative');
  const span = D - 2 * minShift + 1;
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(minShift + Math.floor(rnd() * span));
  return out;
}
