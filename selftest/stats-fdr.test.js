import { test, assert } from '../core/harness.js';
import { bhAdjust } from '../core/stats/fdr.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const TOL = 1e-12;

test('bhAdjust on the given tables', () => {
  assert.deepEqual(bhAdjust([0.01, 0.04, 0.03, 0.005]), [0.02, 0.04, 0.04, 0.02], 'default m');
  assert.deepEqual(bhAdjust([0.001], 10), [0.01], 'm larger than family');
  assert.deepEqual(bhAdjust([0.5, 0.5]), [0.5, 0.5], 'equal middle values');
  assert.deepEqual(bhAdjust([0.9, 0.8]), [0.9, 0.9], 'clamped descending merge');
  assert.deepEqual(bhAdjust([0.001, 0.002], 10), [0.01, 0.01], 'm inflates small p');
  assert.deepEqual(bhAdjust([]), [], 'empty family');
});

test('bhAdjust keeps input order', () => {
  const out = bhAdjust([0.03, 0.005, 0.01, 0.04]);
  assert.deepEqual(out, [0.04, 0.02, 0.02, 0.04], 'reordered input maps back');
});

test('bhAdjust properties over seeded random families', () => {
  function mulberry32(a) {
    return function next() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(1234567);
  for (let t = 0; t < 200; t += 1) {
    const len = 1 + Math.floor(rnd() * 30);
    const p = [];
    for (let i = 0; i < len; i += 1) p.push(rnd());
    const copy = p.slice();
    const q = bhAdjust(p);
    assert.equal(q.length, len, 'length preserved');
    for (let i = 0; i < len; i += 1) {
      assert.ok(q[i] >= p[i] - TOL, `q >= p at ${i}`);
      assert.ok(q[i] <= 1 + TOL, `q capped at 1 at ${i}`);
    }
    for (let i = 0; i < len; i += 1) {
      for (let j = 0; j < len; j += 1) {
        if (p[i] <= p[j]) assert.ok(q[i] <= q[j] + TOL, `monotone ${i}<=${j}`);
      }
    }
    assert.deepEqual(p, copy, 'input array not modified');
  }
});

test('bhAdjust throws RangeError on invalid inputs', () => {
  const check = (fn, msg) => {
    const err = assert.throws(fn, null, msg);
    assert.ok(err instanceof RangeError, `${msg} is a RangeError`);
  };
  check(() => bhAdjust([1.5]), 'p above 1');
  check(() => bhAdjust([-0.1]), 'p below 0');
  check(() => bhAdjust([NaN]), 'NaN p');
  check(() => bhAdjust([0.1, 0.2], 1), 'm smaller than family');
});

test('bhAdjust boundary p values', () => {
  assert.deepEqual(bhAdjust([0]), [0], 'single zero');
  assert.deepEqual(bhAdjust([1]), [1], 'single one');
  assert.deepEqual(bhAdjust([0, 1]), [0, 1], 'zero then one');
});
