// Self-tests for the stratified test functions (phase 4b, tier 4b.2). Toy values are computed by hand in the phase
// prompt; the hand computations for the lag-1 cases are in the comments above each case.
import { test, assert } from '../core/harness.js';
import { mantelHaenszel, inflationFactor, adjustedZ, withinStratumLagOne } from '../core/stats/stratified.js';
import { twoSidedP } from '../core/stats/normal.js';

const TOL = 1e-9;
const near = (a, b, tol = TOL) => Math.abs(a - b) <= tol;
const relNear = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.abs(b);

// Toy A: two strata, hand values: observed 4, expected 4.4, variance 1.30666..., z -0.3499..., rrAdj 0.84.
const TOY_A = [{ N: 10, K: 4, n: 5, k: 3 }, { N: 10, K: 6, n: 4, k: 1 }];
// Toy B: one stratum, hand values: expected 25, variance 6.3131..., z 3.9799..., rrAdj 2.3333...
const TOY_B = [{ N: 100, K: 50, n: 50, k: 35 }];
// Toy C: Toy A plus a stratum with no outcome hits, which adds nothing.
const TOY_C = [...TOY_A, { N: 5, K: 0, n: 2, k: 0 }];

test('Toy A: observed and expected hits', () => {
  const mh = mantelHaenszel(TOY_A);
  assert.ok(near(mh.observed, 4) && near(mh.expected, 4.4), `observed ${mh.observed}, expected ${mh.expected}`);
});

test('Toy A: variance 1.3066666666666666', () => {
  assert.ok(near(mantelHaenszel(TOY_A).variance, 1.3066666666666666), 'variance');
});

test('Toy A: z -0.34992710611188294', () => {
  assert.ok(near(mantelHaenszel(TOY_A).z, -0.34992710611188294), 'z');
});

test('Toy A: p 0.7263934038022961', () => {
  assert.ok(near(twoSidedP(mantelHaenszel(TOY_A).z), 0.7263934038022961), 'p');
});

test('Toy A: rrAdj 0.84', () => {
  assert.ok(near(mantelHaenszel(TOY_A).rrAdj, 0.84), 'rrAdj');
});

test('Toy A with factor 5/3: adjusted z -0.27105237087157563', () => {
  const z = adjustedZ(mantelHaenszel(TOY_A), inflationFactor(0.5, 0.5, 20));
  assert.ok(near(z, -0.27105237087157563), `adjusted z ${z}`);
});

test('Toy A with factor 5/3: p 0.7863507532043055', () => {
  const p = twoSidedP(adjustedZ(mantelHaenszel(TOY_A), inflationFactor(0.5, 0.5, 20)));
  assert.ok(near(p, 0.7863507532043055), `adjusted p ${p}`);
});

test('Toy B: expected 25', () => {
  assert.ok(near(mantelHaenszel(TOY_B).expected, 25), 'expected');
});

test('Toy B: variance 6.313131313131313', () => {
  assert.ok(near(mantelHaenszel(TOY_B).variance, 6.313131313131313), 'variance');
});

test('Toy B: z 3.97994974842648', () => {
  assert.ok(near(mantelHaenszel(TOY_B).z, 3.97994974842648), 'z');
});

test('Toy B: p 6.89298373729535e-05 (relative 1e-6)', () => {
  const p = twoSidedP(mantelHaenszel(TOY_B).z);
  assert.ok(relNear(p, 6.89298373729535e-05), `p ${p}`);
});

test('Toy B: rrAdj 2.3333333333333335', () => {
  assert.ok(near(mantelHaenszel(TOY_B).rrAdj, 2.3333333333333335), 'rrAdj');
});

test('Toy C equals Toy A (a stratum with no hits adds nothing)', () => {
  assert.deepEqual(mantelHaenszel(TOY_C), mantelHaenszel(TOY_A), 'same result');
});

test('inflation (0, 0) is 1', () => {
  assert.ok(near(inflationFactor(0, 0), 1), 'factor');
});

test('inflation (0.5, 0.5) is 5/3', () => {
  assert.ok(near(inflationFactor(0.5, 0.5), 5 / 3), 'factor');
});

test('inflation (0.9, 0.9) is 9.526315789473687', () => {
  assert.ok(near(inflationFactor(0.9, 0.9), 9.526315789473687), 'factor');
});

test('inflation (0.99, 0.99) is capped at 20', () => {
  assert.ok(near(inflationFactor(0.99, 0.99, 20), 20), 'capped');
});

test('inflation (0.5, 0) is 1', () => {
  assert.ok(near(inflationFactor(0.5, 0), 1), 'factor');
});

test('inflation with a negative value (-0.3, 0.8) is 1', () => {
  assert.ok(near(inflationFactor(-0.3, 0.8), 1), 'factor');
});

test('withinStratumLagOne of a constant series is 0', () => {
  const series = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const days = series.map((_, i) => i);
  assert.ok(withinStratumLagOne(series, days, days.map(() => 0)) === 0, 'constant series');
});

test('withinStratumLagOne of 1,0,1,0,... over 10 days in one stratum is -0.9', () => {
  // Hand computation: mean 0.5, deviations +0.5, -0.5, ... Nine consecutive pairs each give -0.25 (sum -2.25).
  // Sum of squares 10 * 0.25 = 2.5. Value -2.25 / 2.5 = -0.9. (The prompt's -1 needed a circular tenth pair;
  // the user chose the linear value on review.)
  const series = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  const days = series.map((_, i) => i);
  const r = withinStratumLagOne(series, days, days.map(() => 0));
  assert.ok(near(r, -0.9), `alternating ${r}`);
});

test('withinStratumLagOne of 1,1,0,0,1,1,0,0 over 8 days in one stratum is 0.125', () => {
  // Hand computation: mean 0.5, deviations +,+,-,-,+,+,-,- (times 0.5). Sum of squares 8 * 0.25 = 2.
  // Seven consecutive products: +0.25, -0.25, +0.25, -0.25, +0.25, -0.25, +0.25, sum +0.25. Value 0.25 / 2 = 0.125.
  const series = [1, 1, 0, 0, 1, 1, 0, 0];
  const days = series.map((_, i) => i);
  const r = withinStratumLagOne(series, days, days.map(() => 0));
  assert.ok(near(r, 0.125), `block ${r}`);
});

test('withinStratumLagOne: two strata with different means and no within-stratum pattern is 0', () => {
  // A raw lag-1 correlation of this series is high (it switches once). Deviations from each stratum mean are all 0,
  // so a trend between strata does not count as autocorrelation.
  const series = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
  const days = series.map((_, i) => i);
  const strataIndex = days.map((d) => (d < 6 ? 0 : 1));
  assert.ok(withinStratumLagOne(series, days, strataIndex) === 0, 'between-stratum trend');
});

test('mantelHaenszel rejects a non-integer count with a RangeError', () => {
  const err = assert.throws(() => mantelHaenszel([{ N: 10, K: 4, n: 5, k: 3.5 }]), null, 'k not integer');
  assert.ok(err instanceof RangeError, 'RangeError');
});

test('mantelHaenszel rejects n above N with a RangeError', () => {
  const err = assert.throws(() => mantelHaenszel([{ N: 10, K: 4, n: 11, k: 3 }]), null, 'n above N');
  assert.ok(err instanceof RangeError, 'RangeError');
});

test('mantelHaenszel rejects k above min(n, K) with a RangeError', () => {
  const err = assert.throws(() => mantelHaenszel([{ N: 10, K: 4, n: 5, k: 6 }]), null, 'k above min');
  assert.ok(err instanceof RangeError, 'RangeError');
});

test('mantelHaenszel rejects a negative count with a RangeError', () => {
  const err = assert.throws(() => mantelHaenszel([{ N: 10, K: -1, n: 5, k: 0 }]), null, 'negative K');
  assert.ok(err instanceof RangeError, 'RangeError');
});

// All days exposed (n = N) is valid: no variance and no denominator, so z is 0 and rrAdj is null.
test('mantelHaenszel accepts n equal to N (all days exposed)', () => {
  const mh = mantelHaenszel([{ N: 10, K: 4, n: 10, k: 4 }]);
  assert.ok(near(mh.observed, 4), `observed ${mh.observed}`);
});

test('mantelHaenszel gives z 0 when the variance is zero', () => {
  assert.ok(mantelHaenszel([{ N: 10, K: 4, n: 10, k: 4 }]).z === 0, 'z is exactly 0');
});

test('mantelHaenszel gives rrAdj null when the denominator is zero', () => {
  assert.ok(mantelHaenszel([{ N: 10, K: 4, n: 10, k: 4 }]).rrAdj === null, 'rrAdj null');
});

// N = 2: V = 1 * 1 * 1 * 1 / (4 * 1) = 0.25 (the N < 2 rule must not apply here).
test('mantelHaenszel variance at N = 2 is 0.25', () => {
  assert.ok(near(mantelHaenszel([{ N: 2, K: 1, n: 1, k: 1 }]).variance, 0.25), 'variance');
});

test('mantelHaenszel variance at N = 1 is 0', () => {
  assert.ok(mantelHaenszel([{ N: 1, K: 1, n: 1, k: 1 }]).variance === 0, 'variance');
});

// Small denominator: num = 1 * 9 / 10 = 0.9, den = 3 * 1 / 10 = 0.3, rrAdj = 3.
test('mantelHaenszel rrAdj with a small denominator is 3', () => {
  assert.ok(near(mantelHaenszel([{ N: 10, K: 4, n: 1, k: 1 }]).rrAdj, 3), 'rrAdj');
});

// No exposed hit gives a zero numerator; the denominator is positive, so rrAdj is 0 and not null.
test('mantelHaenszel rrAdj is 0 with no exposed hit', () => {
  assert.ok(mantelHaenszel([{ N: 10, K: 4, n: 1, k: 0 }]).rrAdj === 0, 'rrAdj 0');
});

// Two observed days in one stratum, values 1 then 0: deviations +0.5 and -0.5, product -0.25, sum of squares 0.5.
test('withinStratumLagOne of one pair 1,0 is -0.5', () => {
  assert.ok(near(withinStratumLagOne([1, 0], [0, 1], [0, 0]), -0.5), 'one pair');
});

// Stratum 0 has days 0 and 2 but they are not consecutive observed days, so no pair exists and the value is 0.
test('withinStratumLagOne with no consecutive pair in one stratum is 0', () => {
  assert.ok(withinStratumLagOne([1, 1, 0], [0, 1, 2], [0, 1, 0]) === 0, 'no pair');
});
