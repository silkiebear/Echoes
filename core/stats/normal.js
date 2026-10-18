// Two-sided normal p-value: P(|Z| >= |z|) = erfc(|z| / sqrt(2)). Pure, no state.
// Below stats.normal.seriesBelow the erf series is used; there erfc = 1 - erf keeps useful accuracy. Above it, erfc is
// computed from its continued fraction, which keeps relative accuracy far into the tail (z of 37 and beyond).
import { stats } from '../../config/stats.js';

const SQRT_PI = Math.sqrt(Math.PI);

// erf(x) = (2 / sqrt(pi)) exp(-x^2) sum_n 2^n x^(2n+1) / (1 * 3 * ... * (2n+1)), for x >= 0.
function erfSeries(x) {
  let term = x;
  let sum = x;
  for (let n = 1; term > sum * Number.EPSILON; n += 1) {
    term *= 2 * x * x / (2 * n + 1);
    sum += term;
  }
  return 2 / SQRT_PI * Math.exp(-x * x) * sum;
}

// erfc(x) = exp(-x^2) / sqrt(pi) / (x + (1/2) / (x + 1 / (x + (3/2) / (x + ...)))), evaluated from the deepest term up.
function erfcFraction(x) {
  let t = x;
  for (let k = stats.normal.fractionTerms; k >= 1; k -= 1) {
    t = x + k / 2 / t;
  }
  return Math.exp(-x * x) / (SQRT_PI * t);
}

export function twoSidedP(z) {
  // The message names the argument only, never a value (diagnostics rule).
  if (typeof z !== 'number' || Number.isNaN(z)) throw new RangeError('z must be a number');
  const x = Math.abs(z) / Math.SQRT2;
  const p = x < stats.normal.seriesBelow ? 1 - erfSeries(x) : erfcFraction(x);
  return Math.min(1, Math.max(0, p));
}
