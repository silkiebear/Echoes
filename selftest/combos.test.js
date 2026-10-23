// Label combination tables (phase 4h, Node). Every case pins one exported function: the hand values from the
// brief, the exact bad inputs that must throw, the __proto__/constructor strings, and the pattern-count sum.
// run-test executes this file; the mutation gate runs it against app\core\combos.js.
import { test, assert } from '../core/harness.js';
import { combos } from '../config/combos.js';
import { combinationTable } from '../core/combos.js';

// The shared day table used by the hand cases: one inner array per observed day.
const D = [
  ['a', 'b'],
  ['a'],
  ['b', 'c'],
  [],
  ['a', 'b', 'c'],
  ['c'],
];

test('combinationTable(D, [a, b]): counts and pattern order', () => {
  assert.deepEqual(combinationTable(D, ['a', 'b']), {
    n: 6,
    ids: ['a', 'b'],
    all: 2,
    none: 2,
    some: 2,
    patterns: [
      { key: '00', count: 2 },
      { key: '11', count: 2 },
      { key: '01', count: 1 },
      { key: '10', count: 1 },
    ],
  }, 'two labels');
});

test('combinationTable(D, [a, b, c]): three labels', () => {
  assert.deepEqual(combinationTable(D, ['a', 'b', 'c']), {
    n: 6,
    ids: ['a', 'b', 'c'],
    all: 1,
    none: 1,
    some: 4,
    patterns: [
      { key: '000', count: 1 },
      { key: '001', count: 1 },
      { key: '011', count: 1 },
      { key: '100', count: 1 },
      { key: '110', count: 1 },
      { key: '111', count: 1 },
    ],
  }, 'three labels');
});

test('combinationTable(D, [a]): single label', () => {
  assert.deepEqual(combinationTable(D, ['a']), {
    n: 6,
    ids: ['a'],
    all: 3,
    none: 3,
    some: 0,
    patterns: [
      { key: '0', count: 3 },
      { key: '1', count: 3 },
    ],
  }, 'single label');
});

test('combinationTable: __proto__ and constructor ids are data, not keys', () => {
  const days = [
    ['__proto__', 'constructor'],
    ['constructor'],
    [],
    ['__proto__'],
  ];
  assert.deepEqual(combinationTable(days, ['__proto__', 'constructor']), {
    n: 4,
    ids: ['__proto__', 'constructor'],
    all: 1,
    none: 1,
    some: 2,
    patterns: [
      { key: '00', count: 1 },
      { key: '01', count: 1 },
      { key: '10', count: 1 },
      { key: '11', count: 1 },
    ],
  }, 'prototype-safe ids');
});

test('combinationTable([], [a]): no days', () => {
  assert.deepEqual(combinationTable([], ['a']), {
    n: 0,
    ids: ['a'],
    all: 0,
    none: 0,
    some: 0,
    patterns: [],
  }, 'empty days');
});

test('combinationTable: the returned ids is a copy', () => {
  const input = ['a', 'b'];
  const { ids } = combinationTable(D, input);
  assert.ok(ids !== input, 'ids must not be the caller array');
  ids.push('x');
  assert.deepEqual(input, ['a', 'b'], 'mutating the copy must not touch the caller');
});

test('combinationTable: bad days and ids throw TypeError', () => {
  const cases = [
    ['days not an array', 'x', ['a', 'b']],
    ['inner day not an array', [['a'], 5], ['a', 'b']],
    ['id not a string', [['a']], ['a', 7]],
  ];
  for (const [label, days, ids] of cases) {
    let threw = false;
    try { combinationTable(days, ids); } catch (e) { threw = e instanceof TypeError; }
    assert.ok(threw, `${label} must throw TypeError`);
  }
});

test('combinationTable: empty, too many and duplicate ids throw RangeError', () => {
  const tooMany = Array.from({ length: combos.comboMax + 1 }, (_, i) => `l${i}`);
  const cases = [
    ['empty ids', D, []],
    ['too many ids', D, tooMany],
    ['duplicate ids', D, ['a', 'a']],
  ];
  for (const [label, days, ids] of cases) {
    let threw = false;
    try { combinationTable(days, ids); } catch (e) { threw = e instanceof RangeError; }
    assert.ok(threw, `${label} must throw RangeError`);
  }
});

test('combinationTable(D, comboMax labels): exactly the maximum succeeds', () => {
  // Proves the upper bound is ">" and not ">=": at comboMax the call must not throw.
  const ids = Array.from({ length: combos.comboMax }, (_, i) => `l${i}`);
  const r = combinationTable(D, ids);
  assert.ok(r, 'must not throw at the maximum');
  assert.ok(r.n === D.length, `n must be ${D.length}`);
  const sum = r.patterns.reduce((acc, p) => acc + p.count, 0);
  assert.ok(sum === r.n, 'pattern counts must sum to n');
});

test('combinationTable: tie groups sort by key ascending, not insertion order', () => {
  // Two single-occurrence patterns whose first-occurrence order is descending by key. The correct
  // result is ascending; a broken tie-break comparator (e.g. returning 0 instead of 1) leaves it descending.
  const r = combinationTable([['a'], ['b']], ['a', 'b']);
  assert.deepEqual(r.patterns, [
    { key: '01', count: 1 },
    { key: '10', count: 1 },
  ], 'tie group must be key-ascending');
});

test('combinationTable: the sum of pattern counts equals n', () => {
  for (const ids of [['a'], ['a', 'b'], ['a', 'b', 'c']]) {
    const { n, patterns } = combinationTable(D, ids);
    const sum = patterns.reduce((acc, p) => acc + p.count, 0);
    assert.ok(sum === n, `patterns sum ${sum} must equal n ${n} for ${ids.join(',')}`);
  }
});
