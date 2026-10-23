// Co-occurrence matrix (phase 4h, C1, Node). Every case pins one exported function: the hand values from the brief,
// the exact bad inputs that must throw, the __proto__/constructor safety, and the symmetry loop. run-test executes
// this file; the mutation gate runs it against app\core\cooccurrence.js.
import { test, assert } from '../core/harness.js';
import { coOccurrence } from '../core/cooccurrence.js';
import { combos } from '../config/combos.js';

// days reused across the hand cases: [['a','b'],['a'],['b','c'],[],['a','b','c'],['c']].
const D = [['a', 'b'], ['a'], ['b', 'c'], [], ['a', 'b', 'c'], ['c']];
// Floating rates (both/counts) are compared within tol to avoid float noise; null cells are compared by identity.
const CLOSE = (a, b, tol) => Math.abs(a - b) <= tol;
const closeMatrix = (actual, expected, tol, label) => {
  assert.ok(actual.length === expected.length, `${label}: row count`);
  for (let i = 0; i < expected.length; i += 1) {
    assert.ok(actual[i].length === expected[i].length, `${label}: row ${i} length`);
    for (let j = 0; j < expected[i].length; j += 1) {
      const e = expected[i][j];
      if (e === null) {
        assert.ok(actual[i][j] === null, `${label}[${i}][${j}] must be null`);
      } else {
        assert.ok(CLOSE(actual[i][j], e, tol), `${label}[${i}][${j}] = ${actual[i][j]}, expected ${e}`);
      }
    }
  }
};

test('coOccurrence: hand case 1 counts, both and conditional', () => {
  const r = coOccurrence(D, ['a', 'b', 'c']);
  assert.ok(r.n === 6, 'n');
  assert.deepEqual(r.counts, [3, 3, 3], 'counts');
  assert.deepEqual(r.both, [[3, 2, 1], [2, 3, 2], [1, 2, 3]], 'both');
  closeMatrix(r.conditional, [[1, 2 / 3, 1 / 3], [2 / 3, 1, 2 / 3], [1 / 3, 2 / 3, 1]], 1e-9, 'conditional');
});

test('coOccurrence: absent label gives a null conditional row (hand case 2)', () => {
  const r = coOccurrence(D, ['a', 'z']);
  assert.ok(r.n === 6, 'n');
  assert.deepEqual(r.counts, [3, 0], 'counts');
  assert.deepEqual(r.both, [[3, 0], [0, 0]], 'both');
  closeMatrix(r.conditional, [[1, 0], [null, null]], 1e-9, 'conditional');
});

test('coOccurrence: prototype-safe ids __proto__ and constructor (hand case 3)', () => {
  const days = [['__proto__', 'constructor'], ['constructor'], [], ['__proto__']];
  const r = coOccurrence(days, ['__proto__', 'constructor']);
  assert.ok(r.n === 4, 'n');
  assert.deepEqual(r.counts, [2, 2], 'counts');
  assert.deepEqual(r.both, [[2, 1], [1, 2]], 'both');
  closeMatrix(r.conditional, [[1, 0.5], [0.5, 1]], 1e-9, 'conditional');
});

test('coOccurrence: empty days give all-null conditional (hand case 4)', () => {
  const r = coOccurrence([], ['a', 'b']);
  assert.ok(r.n === 0, 'n');
  assert.deepEqual(r.counts, [0, 0], 'counts');
  assert.deepEqual(r.both, [[0, 0], [0, 0]], 'both');
  closeMatrix(r.conditional, [[null, null], [null, null]], 1e-9, 'conditional');
});

test('coOccurrence: duplicates inside a day count once (hand case 5)', () => {
  const r = coOccurrence([['a', 'a', 'b']], ['a', 'b']);
  assert.deepEqual(r.counts, [1, 1], 'counts');
  assert.deepEqual(r.both, [[1, 1], [1, 1]], 'both');
});

test('coOccurrence: both[i][j] equals both[j][i] (symmetry loop)', () => {
  const r = coOccurrence(D, ['a', 'b', 'c']);
  for (let i = 0; i < r.both.length; i += 1) {
    for (let j = 0; j < r.both[i].length; j += 1) {
      assert.ok(r.both[i][j] === r.both[j][i], `both[${i}][${j}] == both[${j}][${i}]`);
    }
  }
});

test('coOccurrence: ids is returned as a copy, not the input array', () => {
  const input = ['a', 'b'];
  const r = coOccurrence(D, input);
  r.ids.push('x');
  assert.ok(input.length === 2, 'input array was not grown');
});

test('coOccurrence: bad days throw TypeError', () => {
  let threw = false;
  try { coOccurrence('x', ['a', 'b']); } catch (e) { threw = e instanceof TypeError; }
  assert.ok(threw, "days 'x' must throw TypeError");
  threw = false;
  try { coOccurrence([['a'], 5], ['a', 'b']); } catch (e) { threw = e instanceof TypeError; }
  assert.ok(threw, 'a non-array day must throw TypeError');
});

test('coOccurrence: a non-string id throws TypeError', () => {
  let threw = false;
  try { coOccurrence([['a']], ['a', 7]); } catch (e) { threw = e instanceof TypeError; }
  assert.ok(threw, 'a numeric id must throw TypeError');
});

test('coOccurrence: bad ids throw RangeError', () => {
  const bad = [
    () => coOccurrence(D, ['a']), // too short
    () => coOccurrence(D, ['a', 'a']), // duplicate
    () => coOccurrence(D, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']), // longer than coMax
  ];
  for (const fn of bad) {
    let threw = false;
    try { fn(); } catch (e) { threw = e instanceof RangeError; }
    assert.ok(threw, 'bad ids must throw RangeError');
  }
  assert.ok(combos.coMax === 8, 'sanity: coMax is 8');
});
