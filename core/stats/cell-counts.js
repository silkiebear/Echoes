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

// Prefix sums of the evaluable and hit masks of one (outcome, window) pair: ev[i] counts evaluable days before day i.
export function maskPrefixes(masks, n) {
  const ev = new Int32Array(n + 1);
  const hit = new Int32Array(n + 1);
  for (let t = 0; t < n; t += 1) {
    ev[t + 1] = ev[t] + masks.evaluable[t];
    hit[t + 1] = hit[t] + masks.hit[t];
  }
  return { ev, hit };
}

// Restricted cell (D11, D12). Start days are evaluable and lie in the exposure's active period [first, last] (first and
// last observed use). Counts are split into strata (geo.index, blocks of geo.days from the first observed day). Strata
// with no exposed day add nothing to the Mantel-Haenszel sums, so only strata with n > 0 are returned.
// geo.scratch is reused between cells; the returned strata are fresh objects.
export function restrictedCell(p, e, masks, pre, geo) {
  const { ns, ks, NN, KK } = geo.scratch;
  const a = p.first[e];
  const b = p.last[e];
  const sLo = geo.index[a];
  const sHi = geo.index[b];
  let N = 0;
  let K = 0;
  for (let s = sLo; s <= sHi; s += 1) {
    const r0 = Math.max(a, geo.base + s * geo.days);
    const r1 = Math.min(b, geo.base + (s + 1) * geo.days - 1);
    NN[s] = pre.ev[r1 + 1] - pre.ev[r0];
    KK[s] = pre.hit[r1 + 1] - pre.hit[r0];
    ns[s] = 0;
    ks[s] = 0;
    N += NN[s];
    K += KK[s];
  }
  let n = 0;
  let k = 0;
  for (const d of p.labelDays[e]) {
    if (!masks.evaluable[d]) continue;
    const s = geo.index[d];
    ns[s] += 1;
    n += 1;
    if (masks.hit[d]) {
      ks[s] += 1;
      k += 1;
    }
  }
  const strata = [];
  for (let s = sLo; s <= sHi; s += 1) {
    if (ns[s] > 0) strata.push({ N: NN[s], K: KK[s], n: ns[s], k: ks[s] });
  }
  return { N, K, n, k, strata };
}

// Per-stratum totals of one (outcome, window) pair over the whole series (phase 4d, option B). A block that lies fully
// inside an active period takes these totals; the two edge blocks are counted day by day.
export function bandTotals(p, masks, geo) {
  const totN = new Int32Array(geo.count);
  const totK = new Int32Array(geo.count);
  if (geo.base < 0) return { totN, totK };
  for (let t = geo.base; t < p.n; t += 1) {
    if (!masks.evaluable[t]) continue;
    const s = geo.index[t];
    totN[s] += 1;
    if (masks.hit[t]) totK[s] += 1;
  }
  return { totN, totK };
}

// Restricted cell with logging-volume bands (phase 4d, option B). The same counts as restrictedCell, split by the band
// of each day: strata are blocks times bands, so a block's band s is block * bands + band.
export function restrictedCellBanded(p, e, masks, totals, geo) {
  const { ns, ks, NN, KK } = geo.scratch;
  const { bands, base, days } = geo;
  const a = p.first[e];
  const b = p.last[e];
  const blockLo = Math.floor((a - base) / days);
  const blockHi = Math.floor((b - base) / days);
  const sLo = blockLo * bands;
  const sHi = (blockHi + 1) * bands - 1;
  for (let s = sLo; s <= sHi; s += 1) {
    NN[s] = 0;
    KK[s] = 0;
    ns[s] = 0;
    ks[s] = 0;
  }
  for (let bl = blockLo; bl <= blockHi; bl += 1) {
    const start = base + bl * days;
    const end = start + days - 1;
    if (start >= a && end <= b) {
      for (let q = 0; q < bands; q += 1) {
        NN[bl * bands + q] = totals.totN[bl * bands + q];
        KK[bl * bands + q] = totals.totK[bl * bands + q];
      }
    } else {
      const r1 = Math.min(b, end, p.n - 1);
      for (let t = Math.max(a, start); t <= r1; t += 1) {
        if (!masks.evaluable[t]) continue;
        const s = geo.index[t];
        NN[s] += 1;
        if (masks.hit[t]) KK[s] += 1;
      }
    }
  }
  let n = 0;
  let k = 0;
  for (const d of p.labelDays[e]) {
    if (!masks.evaluable[d]) continue;
    const s = geo.index[d];
    ns[s] += 1;
    n += 1;
    if (masks.hit[d]) {
      ks[s] += 1;
      k += 1;
    }
  }
  let N = 0;
  let K = 0;
  const strata = [];
  for (let s = sLo; s <= sHi; s += 1) {
    N += NN[s];
    K += KK[s];
    if (ns[s] > 0) strata.push({ N: NN[s], K: KK[s], n: ns[s], k: ks[s] });
  }
  return { N, K, n, k, strata };
}
