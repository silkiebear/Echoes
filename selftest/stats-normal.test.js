// Self-tests for the two-sided normal p-value (phase 4b, tier 4b.2). Reference values are from the phase prompt.
import { test, assert } from '../core/harness.js';
import { twoSidedP } from '../core/stats/normal.js';

const REL_TOL = 1e-6;
const relNear = (a, b) => Math.abs(a - b) <= REL_TOL * Math.abs(b);

test('twoSidedP(0) is 1', () => {
  assert.ok(relNear(twoSidedP(0), 1), `z 0: ${twoSidedP(0)}`);
});

test('twoSidedP(1.96) matches 0.04999579029644087', () => {
  assert.ok(relNear(twoSidedP(1.96), 0.04999579029644087), `z 1.96: ${twoSidedP(1.96)}`);
});

test('twoSidedP(3) matches 0.0026997960632601913', () => {
  assert.ok(relNear(twoSidedP(3), 0.0026997960632601913), `z 3: ${twoSidedP(3)}`);
});

test('twoSidedP(10) matches 1.5239706048321186e-23 in the far tail', () => {
  assert.ok(relNear(twoSidedP(10), 1.5239706048321186e-23), `z 10: ${twoSidedP(10)}`);
});

test('twoSidedP(37) matches 1.1451142445050278e-299 in the far tail', () => {
  assert.ok(relNear(twoSidedP(37), 1.1451142445050278e-299), `z 37: ${twoSidedP(37)}`);
});

test('twoSidedP is symmetric: -1.96 equals 1.96', () => {
  assert.equal(twoSidedP(-1.96), twoSidedP(1.96), 'sign does not matter');
});

test('twoSidedP stays in [0, 1]', () => {
  const p = twoSidedP(1e-300);
  assert.ok(p >= 0 && p <= 1, `small z: ${p}`);
});

test('twoSidedP of NaN throws a RangeError', () => {
  const err = assert.throws(() => twoSidedP(NaN), null, 'NaN must throw');
  assert.ok(err instanceof RangeError, 'RangeError');
});
