// Seeded random generator (core\rng.js, Node). Every case pins one exported function: the hand
// values from the brief, the spread over 10000 draws, the reproducibility, and the bad seeds.
// run-test executes this file; the mutation gate runs it against app\core\rng.js.
import { test, assert } from '../core/harness.js';
import { makeRng } from '../core/rng.js';

// Two values are close enough when they agree to tol, avoiding float noise in the comparison.
const CLOSE = (a, b, tol) => Math.abs(a - b) <= tol;

// Pull the first five values of a seed, to compare against the brief's hand table.
function firstFive(seed) {
  const g = makeRng(seed);
  return [g(), g(), g(), g(), g()];
}

// Compare two sequences element-wise, each within tol, so the rounded hand values match the full-precision output.
function closeSequence(actual, expected, tol, label) {
  for (let i = 0; i < expected.length; i += 1) {
    assert.ok(CLOSE(actual[i], expected[i], tol), `${label} draw ${i}: ${actual[i]} not near ${expected[i]}`);
  }
}

test('makeRng: the four hand sequences (tolerance 1e-9)', () => {
  closeSequence(firstFive(1), [0.6270739406, 0.0027357212, 0.52744704, 0.9810509675, 0.9683778982], 1e-9, 'seed 1');
  closeSequence(firstFive(0), [0.2664292087, 0.0003297457, 0.2232720274, 0.1462021479, 0.4673278229], 1e-9, 'seed 0');
  closeSequence(firstFive(12345), [0.9797282678, 0.3067522645, 0.4842054215, 0.8179344125, 0.5094283693], 1e-9, 'seed 12345');
  closeSequence(firstFive(-7), [0.4330673341, 0.3253957673, 0.5442695003, 0.4801899937, 0.0487195582], 1e-9, 'seed -7');
});

test('makeRng: 10000 draws of seed 1 mean within 0.01 of 0.5', () => {
  const g = makeRng(1);
  let sum = 0;
  for (let i = 0; i < 10000; i += 1) {
    sum += g();
  }
  const mean = sum / 10000;
  assert.ok(CLOSE(mean, 0.49819683, 0.01), `mean ${mean} not near 0.5`);
});

test('makeRng: 10000 draws of seed 2 stay inside [0, 1)', () => {
  const g = makeRng(2);
  let min = 1;
  let max = 0;
  for (let i = 0; i < 10000; i += 1) {
    const v = g();
    if (v < min) min = v;
    if (v > max) max = v;
  }
  assert.ok(min >= 0 && min < 1, `min ${min} out of [0, 1)`);
  assert.ok(max >= 0 && max < 1, `max ${max} out of [0, 1)`);
  // Reference values from the brief, within tolerance.
  assert.ok(CLOSE(min, 0.000151145, 1e-8), `min ${min} not near reference`);
  assert.ok(CLOSE(max, 0.999963366, 1e-8), `max ${max} not near reference`);
});

test('makeRng: the same seed repeats across two generators', () => {
  const a = makeRng(7);
  const b = makeRng(7);
  for (let i = 0; i < 100; i += 1) {
    assert.ok(CLOSE(a(), b(), 0), `draw ${i} differs for the same seed`);
  }
});

test('makeRng: seeds 1 and 2 give different first values', () => {
  assert.ok(makeRng(1) !== makeRng(2), 'first values of seed 1 and seed 2 are equal');
});

test('makeRng: non-integer, string, null, NaN and undefined seeds throw TypeError', () => {
  for (const bad of [1.5, '1', null, NaN, undefined]) {
    let threw = false;
    try { makeRng(bad); } catch (e) { threw = e instanceof TypeError; }
    assert.ok(threw, `makeRng(${JSON.stringify(bad)}) must throw TypeError`);
  }
});
