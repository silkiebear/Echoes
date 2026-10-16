// Prepared input for the scan (decisions D1 and D2). Built once per run:
//   observed     day is observed (D1): entries, and the tracker label when one is set
//   obsPrefix    observed days before each day (prefix counts, length n + 1)
//   labelDays    per label id, the sorted observed days that carry it
//   prefix       per label id, observed days carrying it before each day (length n + 1)
//   first, last  per label id, first and last observed day carrying it (-1 when none)
//   lowComp      start days with low completeness (same rule as core/quality.js)
//   lagOne       per label id, lag-1 correlation of daily presence over observed pairs (long runs when high)
import { settingsConfig } from '../../config/settings.js';

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Label ids must be the array positions, so per-label arrays can be indexed by id. Messages carry counts, not values.
function checkLabelIds(labels) {
  labels.forEach((label, i) => {
    if (label.id !== i) throw new RangeError('label ids must equal their array positions');
  });
}

function observedMask(data, settings) {
  const days = data.days;
  const tracker = settings.observation.trackerLabel.trim();
  let trackerId = null;
  if (tracker !== '') {
    const label = data.labels.find((l) => l.text === tracker);
    trackerId = label ? label.id : -1;
  }
  const observed = new Uint8Array(days.length);
  for (let t = 0; t < days.length; t += 1) {
    const d = days[t];
    const ok = tracker === '' || (trackerId >= 0 && d.labels.includes(trackerId));
    if (d.entryCount > 0 && ok) observed[t] = 1;
  }
  return observed;
}

function lowCompletenessMask(data, observed) {
  const withEntries = data.days.filter((d) => d.entryCount > 0);
  const threshold = settingsConfig.completeness.minMarksFraction * median(withEntries.map((d) => d.labels.length));
  const low = new Uint8Array(data.days.length);
  data.days.forEach((d, t) => {
    if (observed[t] && d.entryCount > 0 && d.labels.length < threshold) low[t] = 1;
  });
  return low;
}

function prefixOf(n, flags) {
  const out = new Int32Array(n + 1);
  for (let t = 0; t < n; t += 1) out[t + 1] = out[t] + flags[t];
  return out;
}

// Phi coefficient of the 2 x 2 table of (presence on day t, presence on day t + 1) over pairs of observed days.
// Zero when a margin is empty: a constant label has no run structure to measure.
export function lagOneCorrelation(flags, observed) {
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  for (let t = 0; t + 1 < flags.length; t += 1) {
    if (!observed[t] || !observed[t + 1]) continue;
    if (flags[t]) {
      if (flags[t + 1]) a += 1;
      else b += 1;
    } else if (flags[t + 1]) c += 1;
    else d += 1;
  }
  const denom = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  return denom === 0 ? 0 : (a * d - b * c) / denom;
}

export function prepare({ data, settings }) {
  checkLabelIds(data.labels);
  const n = data.days.length;
  const L = data.labels.length;
  const observed = observedMask(data, settings);
  const labelDays = Array.from({ length: L }, () => []);
  for (let t = 0; t < n; t += 1) {
    if (!observed[t]) continue;
    for (const id of data.days[t].labels) labelDays[id].push(t);
  }
  const prefix = [];
  const lagOne = [];
  const first = new Int32Array(L).fill(-1);
  const last = new Int32Array(L).fill(-1);
  for (let id = 0; id < L; id += 1) {
    const flags = new Uint8Array(n);
    for (const t of labelDays[id]) flags[t] = 1;
    prefix.push(prefixOf(n, flags));
    lagOne.push(lagOneCorrelation(flags, observed));
    labelDays[id] = Int32Array.from(labelDays[id]);
    if (labelDays[id].length) {
      first[id] = labelDays[id][0];
      last[id] = labelDays[id][labelDays[id].length - 1];
    }
  }
  return {
    n,
    labelCount: L,
    observed,
    obsPrefix: prefixOf(n, observed),
    labelDays,
    prefix,
    first,
    last,
    lagOne,
    lowComp: lowCompletenessMask(data, observed),
  };
}
