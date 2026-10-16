import { test, assert } from '../core/harness.js';
import { circularShift, empiricalP, percentileRank, shiftOffsets } from '../core/stats/placebo.js';

const near = (a, b, tol) => (a === null || b === null ? a === b : Math.abs(a - b) <= tol);

test('circularShift rotates right by any k', () => {
  assert.deepEqual(circularShift([1, 0, 0, 1, 0], 2), [1, 0, 1, 0, 0], 'rotate right 2');
  assert.deepEqual(circularShift([1, 0, 0, 1, 0], -1), [0, 0, 1, 0, 1], 'rotate left 1');
  assert.deepEqual(circularShift([1, 0, 0, 1, 0], 7), [1, 0, 1, 0, 0], 'k larger than length');
  assert.deepEqual(circularShift([], 3), [], 'empty stays empty');
});

test('circularShift returns a new array and leaves the input unchanged', () => {
  const input = [1, 0, 0, 1, 0];
  const copy = input.slice();
  const out = circularShift(input, 3);
  assert.deepEqual(input, copy, 'input unchanged');
  assert.ok(out !== input, 'a new array is returned');
});

test('empiricalP on the given tables', () => {
  assert.equal(empiricalP(5, [1, 2, 5, 7, 3, 9, 0, 5, 4, 6]), 6 / 11, 'six of eleven');
  assert.equal(empiricalP(10, [1, 2, 3]), 1 / 4, 'only the +1 denominator');
  assert.equal(empiricalP(0, [1, 2, 3]), 1, 'everything counts');
  assert.equal(empiricalP(3, []), 1, 'empty placebo is one');
});

test('percentileRank on the given tables', () => {
  assert.equal(percentileRank(5, [1, 2, 5, 7, 3, 9, 0, 5, 4, 6]), 0.6, 'half ties count');
  assert.equal(percentileRank(0, [1, 2]), 0, 'below everything');
  assert.equal(percentileRank(3, [1, 2]), 1, 'above everything');
  assert.equal(percentileRank(2, [2, 2]), 0.5, 'all ties');
  assert.equal(percentileRank(1, []), null, 'empty placebo is null');
});

test('shiftOffsets draws from minShift over a D-wide window', () => {
  const seq = [0, 0.5, 0.999999];
  let i = 0;
  const rnd = () => seq[i++];
  assert.deepEqual(shiftOffsets(100, 3, 10, rnd), [10, 50, 90], 'window of 81');

  const zero = shiftOffsets(100, 0, 10, () => 0);
  assert.deepEqual(zero, [], 'count zero gives an empty array');
});

test('shiftOffsets throws RangeError on an impossible window or negative count', () => {
  const check = (fn, msg) => {
    const err = assert.throws(fn, null, msg);
    assert.ok(err instanceof RangeError, `${msg} is a RangeError`);
  };
  check(() => shiftOffsets(10, 1, 6, () => 0), 'window below zero');
  check(() => shiftOffsets(100, -1, 10, () => 0), 'negative count');
});

test('circularShift and shiftOffsets boundaries', () => {
  assert.deepEqual(circularShift([7], 3), [7], 'single element rotates to itself');
  assert.deepEqual(shiftOffsets(20, 2, 10, () => 0), [10, 10], 'two offsets');
  assert.deepEqual(shiftOffsets(20, 1, 10, () => 0.999), [10], 'one offset near boundary');
  const check = (fn, msg) => {
    assert.throws(fn, null, msg);
  };
  check(() => shiftOffsets(19, 1, 10, () => 0), 'window below zero');
});
