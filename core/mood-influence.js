// Mood-influence interval (phase 4h.3, Node). Given a present flag per observed day and a scored mood per
// day (null = no score that day), this reports the difference of mood means between present and absent days
// and a circular block-bootstrap confidence interval for that difference. Seeded, so two calls with the same
// inputs and seed give the same interval. See briefs section M1 for the exact algorithm and hand values.
import { makeRng } from './rng.js';

export function moodInfluence(present, mood, options) {
  // Type guards first: the three inputs must have the right shape before anything else is trusted.
  if (!Array.isArray(present)) {
    throw new TypeError('present must be an array');
  }
  if (!Array.isArray(mood)) {
    throw new TypeError('mood must be an array');
  }
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  const D = present.length;
  if (D !== mood.length) {
    throw new RangeError('present and mood must have the same length');
  }
  // Every present flag must be exactly 0 or 1 (the string '1' is not allowed); every mood entry must be a real
  // number or null (NaN and strings are not allowed).
  for (let i = 0; i < D; i += 1) {
    const flag = present[i];
    if (flag !== 0 && flag !== 1) {
      throw new TypeError('present entries must be 0 or 1');
    }
    const m = mood[i];
    if (m !== null && (typeof m !== 'number' || Number.isNaN(m))) {
      throw new TypeError('mood entries must be a number or null');
    }
  }
  // Option validation. blockLength depends on D, so it is checked after the length is known. A bad option is a
  // RangeError, distinct from the TypeError above for the inputs.
  const { seed, resamples, blockLength, level, minPerGroup, maxSkipShare } = options;
  if (!Number.isInteger(seed)) {
    throw new RangeError('seed must be an integer');
  }
  if (!Number.isInteger(resamples) || resamples < 1) {
    throw new RangeError('resamples must be an integer of at least 1');
  }
  if (!Number.isInteger(blockLength) || blockLength < 1 || blockLength > D) {
    throw new RangeError('blockLength must be an integer from 1 to the number of days');
  }
  if (!(level > 0 && level < 1)) {
    throw new RangeError('level must be a number above 0 and below 1');
  }
  if (!Number.isInteger(minPerGroup) || minPerGroup < 1) {
    throw new RangeError('minPerGroup must be an integer of at least 1');
  }
  if (!(maxSkipShare >= 0 && maxSkipShare <= 1)) {
    throw new RangeError('maxSkipShare must be a number from 0 to 1');
  }

  // Full-data means. A day with a null mood is ignored in every mean, so it counts toward neither n1 nor n0.
  let n1 = 0;
  let n0 = 0;
  let sum1 = 0;
  let sum0 = 0;
  for (let i = 0; i < D; i += 1) {
    if (present[i] === 1) {
      if (mood[i] !== null) {
        n1 += 1;
        sum1 += mood[i];
      }
    } else if (mood[i] !== null) {
      n0 += 1;
      sum0 += mood[i];
    }
  }
  const mean1 = n1 === 0 ? null : sum1 / n1;
  const mean0 = n0 === 0 ? null : sum0 / n0;
  const diff = mean1 === null || mean0 === null ? null : mean1 - mean0;

  // Gating: too few scored days in either group means no interval is computed.
  if (n1 < minPerGroup || n0 < minPerGroup) {
    return fullResult('too-few-days', n1, n0, mean1, mean0, diff, blockLength, level, null, null, 0, 0);
  }

  // Circular block bootstrap. The same generator is created once and reused across all resamples.
  const next = makeRng(seed);
  const kept = [];
  let skipped = 0;
  for (let r = 0; r < resamples; r += 1) {
    const idx = [];
    while (idx.length < D) {
      const s = Math.floor(next() * D);
      for (let b = 0; b < blockLength; b += 1) {
        if (idx.length < D) {
          idx.push((s + b) % D);
        }
      }
    }
    // Repeated indexes count repeatedly, so walk idx (not 0..D-1).
    let c1 = 0;
    let c0 = 0;
    let s1 = 0;
    let s0 = 0;
    for (let k = 0; k < idx.length; k += 1) {
      const i = idx[k];
      if (present[i] === 1) {
        if (mood[i] !== null) {
          c1 += 1;
          s1 += mood[i];
        }
      } else if (mood[i] !== null) {
        c0 += 1;
        s0 += mood[i];
      }
    }
    if (c1 === 0 || c0 === 0) {
      skipped += 1;
    } else {
      kept.push(s1 / c1 - s0 / c0);
    }
  }

  // Too many resamples collapsed to a single group: no interval, but count what survived.
  if (skipped > maxSkipShare * resamples) {
    return fullResult('too-many-skipped', n1, n0, mean1, mean0, diff, blockLength, level, null, null, kept.length, skipped);
  }

  // Sorted kept differences, with the interval taken from the matching order statistics.
  kept.sort((x, y) => x - y);
  const m = kept.length;
  const a = (1 - level) / 2;
  const lo = kept[Math.floor(a * m)];
  const hi = kept[Math.min(m - 1, Math.ceil((1 - a) * m) - 1)];
  return fullResult('ok', n1, n0, mean1, mean0, diff, blockLength, level, lo, hi, m, skipped);
}

function fullResult(status, n1, n0, mean1, mean0, diff, blockLength, level, lo, hi, resamples, skipped) {
  return { status, n1, n0, mean1, mean0, diff, blockLength, level, lo, hi, resamples, skipped };
}
