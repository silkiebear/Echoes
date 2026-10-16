// Benjamini-Hochberg (BH) adjustment. The family has m members; members beyond the given p-values count as p = 1,
// so a scan that tested fewer cells than the family size is not overstated.
export function bhAdjust(pvalues, m = pvalues.length) {
  const len = pvalues.length;
  // Error messages name the argument only, never its value (diagnostics rule).
  if (m < len) throw new RangeError('m must be at least the number of p-values');
  for (const p of pvalues) {
    if (typeof p !== 'number' || !(p >= 0 && p <= 1)) throw new RangeError('p-values must be numbers in [0, 1]');
  }
  const order = pvalues.map((_, i) => i).sort((a, b) => pvalues[a] - pvalues[b] || a - b);
  const q = new Array(len);
  // Walk from the largest rank down; the running minimum makes the adjusted values monotone in p.
  let running = 1;
  for (let r = len; r >= 1; r -= 1) {
    const i = order[r - 1];
    running = Math.min(running, (pvalues[i] * m) / r);
    q[i] = running;
  }
  return q;
}

// BH on the kept cells (decision D4). The kept p-values are the ones at or below pKeep, and m is the number of tested
// cells. Returns q in input order, or null where q is at or above pKeep (not significant at the kept level).
export function bhOnKept(keptP, m, pKeep) {
  return bhAdjust(keptP, m).map((q) => (q < pKeep ? q : null));
}
