// Logging volume per observed day (phase 4d, 4d.3, option B): the number of distinct labels logged on the day. Counts only:
// no label ids or texts leave this file. Pure: no DOM, no store, no logging.
// dailyVolumes(p) -> Int32Array(n), 0 on unobserved days. volumeSummary(values, quantiles) -> { days, min, p10, median,
// p90, max } with nearest-rank quantiles (the value at rank ceil(q x m) of the sorted list), or null when there is no day.
export function dailyVolumes(p) {
  const out = new Int32Array(p.n);
  for (let id = 0; id < p.labelCount; id += 1) {
    for (const t of p.labelDays[id]) out[t] += 1;
  }
  return out;
}

// The observed days of one block, with their volumes. Used by the band rule in strata.js as well.
export function observedVolumes(p, volumes) {
  const values = [];
  for (let t = 0; t < p.n; t += 1) if (p.observed[t]) values.push(volumes[t]);
  return values;
}

function nearestRank(sorted, q) {
  const rank = Math.max(1, Math.ceil(q * sorted.length));
  return sorted[rank - 1];
}

export function volumeSummary(values, quantiles) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const [q10, q50, q90] = quantiles;
  return {
    days: sorted.length,
    min: sorted[0],
    p10: nearestRank(sorted, q10),
    median: nearestRank(sorted, q50),
    p90: nearestRank(sorted, q90),
    max: sorted[sorted.length - 1],
  };
}
