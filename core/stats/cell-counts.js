// Start-day masks and cell counts (decision D2). A start day d is evaluable for outcome o and window w when:
// d is observed; d + w is inside the data; d + 1 is not before the first observed o; d + w is not after the last
// observed o; and the days d+1..d+w hold at least ceil(minWindowCoverage * w) observed days. hit(d): o is observed
// on at least one of d+1..d+w. Day d itself never counts toward the window.
export function outcomeMasks(p, o, w, minWindowCoverage) {
  const evaluable = new Uint8Array(p.n);
  const hit = new Uint8Array(p.n);
  const need = Math.ceil(minWindowCoverage * w);
  const outPre = p.prefix[o];
  let N = 0;
  let K = 0;
  const first = p.first[o];
  const last = Math.min(p.last[o], p.n - 1);
  if (first >= 0) {
    for (let d = Math.max(0, first - 1); d + w <= last; d += 1) {
      if (!p.observed[d]) continue;
      // Prefix index i counts days before i, so days d+1..d+w are the difference between indexes d+1 and d+w+1.
      if (p.obsPrefix[d + w + 1] - p.obsPrefix[d + 1] < need) continue;
      evaluable[d] = 1;
      N += 1;
      if (outPre[d + w + 1] - outPre[d + 1] > 0) {
        hit[d] = 1;
        K += 1;
      }
    }
  }
  return { evaluable: evaluable, hit, N, K };
}

// Evaluable exposed days of exposure e: n exposed, k of them followed by the outcome.
export function exposedCounts(p, e, masks) {
  let n = 0;
  let k = 0;
  for (const d of p.labelDays[e]) {
    if (!masks.evaluable[d]) continue;
    n += 1;
    if (masks.hit[d]) k += 1;
  }
  return { n, k };
}

// Full counts of exposure e over a start-day mask (used for the low-completeness and time-split recomputes).
export function countsIn(p, e, evalMask, hit) {
  let N = 0;
  let K = 0;
  for (let d = 0; d < p.n; d += 1) {
    if (!evalMask[d]) continue;
    N += 1;
    if (hit[d]) K += 1;
  }
  let n = 0;
  let k = 0;
  for (const d of p.labelDays[e]) {
    if (!evalMask[d]) continue;
    n += 1;
    if (hit[d]) k += 1;
  }
  return { n, k, N, K };
}

// Start days in [from, to) that are also evaluable in masks.
export function restrictMask(evalMask, from, to) {
  const out = new Uint8Array(evalMask.length);
  for (let d = from; d < to; d += 1) out[d] = evalMask[d];
  return out;
}
