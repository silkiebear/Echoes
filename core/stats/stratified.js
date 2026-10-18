// Stratified test for one cell (phase 4b, decisions D12 to D14). Pure functions, no state.
// A stratum is { N, K, n, k }: population days, outcome hit days, exposed days, exposed hit days. Within a stratum
// the exposed days are a hypergeometric draw from the N days, so sum(k) has mean sum(E) and variance sum(V)
// (Mantel-Haenszel). Autocorrelation is handled by an inflation factor on the variance (inflationFactor, adjustedZ).

import { stats } from '../../config/stats.js';

const isCount = (value) => Number.isInteger(value) && value >= 0;

// Errors name the argument and the stratum index only, never a value (diagnostics rule).
function checkStratum(s, i) {
  for (const field of ['N', 'K', 'n', 'k']) {
    if (!isCount(s[field])) throw new RangeError(`strata[${i}].${field} must be a non-negative integer`);
  }
  if (s.n > s.N) throw new RangeError(`strata[${i}]: n exceeds N`);
  if (s.K > s.N) throw new RangeError(`strata[${i}]: K exceeds N`);
  if (s.k > Math.min(s.n, s.K)) throw new RangeError(`strata[${i}]: k exceeds min(n, K)`);
}

// strata = [{ N, K, n, k }]. Returns the summed observed and expected hits, the summed variance, the z score,
// and rrAdj, the Mantel-Haenszel rate ratio (null when its denominator is zero).
export function mantelHaenszel(strata) {
  if (!Array.isArray(strata)) throw new RangeError('strata must be an array');
  let observed = 0;
  let expected = 0;
  let variance = 0;
  let num = 0;
  let den = 0;
  strata.forEach((s, i) => {
    checkStratum(s, i);
    const { N, K, n, k } = s;
    // With N = 0, n, K and k are all 0 (checked above): the stratum carries no information.
    if (N === 0) return;
    observed += k;
    expected += n * K / N;
    variance += N < 2 ? 0 : n * (N - n) * K * (N - K) / (N * N * (N - 1));
    num += k * (N - n) / N;
    den += (K - k) * n / N;
  });
  const z = variance > 0 ? (observed - expected) / Math.sqrt(variance) : 0;
  return { z, variance, observed, expected, rrAdj: den > 0 ? num / den : null };
}

// Each correlation is clamped to [0, maxRho]: a negative value counts as no inflation.
function clampRho(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new RangeError('correlations must be numbers');
  return Math.min(stats.inflation.maxRho, Math.max(0, value));
}

// Variance inflation for lag-1 dependence of exposure days (a) and outcome days (b): (1 + a b) / (1 - a b), capped at
// maxFactor. A first-order correction chosen by design, not a proven bound (UNVERIFIED on real data).
export function inflationFactor(phiExposure, phiOutcome, maxFactor = Infinity) {
  const ab = clampRho(phiExposure) * clampRho(phiOutcome);
  return Math.min(maxFactor, (1 + ab) / (1 - ab));
}

// z divided by the square root of the variance inflation factor (the standard error grows by sqrt(factor)).
export function adjustedZ(mh, factor) {
  return mh.z / Math.sqrt(factor);
}

// Pooled lag-1 correlation of 0/1 deviations from the stratum mean, over consecutive observed days in one stratum.
// series[d] is the 0/1 value on day d; strataIndex[d] its stratum; observedDays the sorted days observed.
// Deviating from a stratum mean means a trend between strata does not count as autocorrelation.
export function withinStratumLagOne(series, observedDays, strataIndex) {
  const totals = new Map();
  for (const d of observedDays) {
    const s = strataIndex[d];
    const acc = totals.get(s) || { sum: 0, count: 0 };
    acc.sum += series[d];
    acc.count += 1;
    totals.set(s, acc);
  }
  let sumSq = 0;
  let sumProd = 0;
  let pairs = 0;
  let prevDev = 0;
  let prevStratum = null;
  for (const d of observedDays) {
    const s = strataIndex[d];
    const acc = totals.get(s);
    const dev = series[d] - acc.sum / acc.count;
    sumSq += dev * dev;
    if (prevStratum === s) {
      sumProd += prevDev * dev;
      pairs += 1;
    }
    prevDev = dev;
    prevStratum = s;
  }
  if (sumSq === 0 || pairs === 0) return 0;
  return sumProd / sumSq;
}
