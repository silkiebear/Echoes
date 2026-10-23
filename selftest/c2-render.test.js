// Combination table model (phase 4h, C2, Node). The view is pure: buildTableModel(data, texts) returns plain strings
// and objects. Data here are hand-written combinationTable results for the hand cases of briefs section C2, so the
// expected values do not come from the view. The view file does not exist before the delegate writes it: this file
// fails until then (the plant for the view gate).
import { test, assert } from '../core/harness.js';
import { buildTableModel } from '../views/c2-combo-table.js';
import { explore } from '../config/explore.js';
import { formatPercent } from '../core/format.js';

const ui = explore.ui;

// D = [['a','b'],['a'],['b','c'],[],['a','b','c'],['c']]: n 6.
const AB = { n: 6, ids: ['a', 'b'], all: 2, none: 2, some: 2, patterns: [
  { key: '00', count: 2 }, { key: '11', count: 2 }, { key: '01', count: 1 }, { key: '10', count: 1 },
] };
const ABC = { n: 6, ids: ['a', 'b', 'c'], all: 1, none: 1, some: 4, patterns: [
  { key: '000', count: 1 }, { key: '001', count: 1 }, { key: '011', count: 1 },
  { key: '100', count: 1 }, { key: '110', count: 1 }, { key: '111', count: 1 },
] };
const A = { n: 6, ids: ['a'], all: 3, none: 3, some: 0, patterns: [{ key: '0', count: 3 }, { key: '1', count: 3 }] };
const PROTO = { n: 4, ids: ['__proto__', 'constructor'], all: 1, none: 1, some: 2, patterns: [
  { key: '00', count: 1 }, { key: '01', count: 1 }, { key: '10', count: 1 }, { key: '11', count: 1 },
] };
const EMPTY = { n: 0, ids: ['a'], all: 0, none: 0, some: 0, patterns: [] };
// Two labels never on the same day: no row has every label present, so no badge.
const NEVER = { n: 2, ids: ['a', 'b'], all: 0, none: 0, some: 2, patterns: [{ key: '01', count: 1 }, { key: '10', count: 1 }] };

const summaryOf = (d) => ui.cbSummary
  .replace('{all}', String(d.all)).replace('{none}', String(d.none))
  .replace('{some}', String(d.some)).replace('{n}', String(d.n));

test('summary line: all, none, some and n come from the table', () => {
  const m = buildTableModel(AB, ['A', 'B']);
  assert.deepEqual(m.summary, 'All together: 2 days. None of them: 2 days. Some but not all: 2 days. (6 observed days)', 'hand case ab');
  assert.deepEqual(buildTableModel(EMPTY, ['A']).summary, summaryOf(EMPTY), 'empty case');
});

test('headers: label texts verbatim, then the two column texts', () => {
  assert.deepEqual(buildTableModel(AB, ['A', 'B']).headers, ['A', 'B', ui.cbDays, ui.cbShare], 'ab headers');
  assert.deepEqual(buildTableModel(A, ['A']).headers, ['A', ui.cbDays, ui.cbShare], 'one label');
  assert.deepEqual(buildTableModel(EMPTY, ['A']).headers, ['A', ui.cbDays, ui.cbShare], 'empty headers');
});

test('headers: a label text with markup stays verbatim', () => {
  const m = buildTableModel(AB, ['<b>&', 'x']);
  assert.deepEqual(m.headers[0], '<b>&', 'markup kept, not escaped');
});

test('rows: hand case ab, order as given, days and share formatted', () => {
  const m = buildTableModel(AB, ['A', 'B']);
  assert.deepEqual(m.rows.map((r) => r.days), ['2', '2', '1', '1'], 'days in pattern order');
  assert.deepEqual(m.rows.map((r) => r.share), [2, 2, 1, 1].map((c) => formatPercent(c / 6)), 'share per row');
});

test('rows: cells follow the key, with word, mark and class from config', () => {
  const m = buildTableModel(AB, ['A', 'B']);
  const row01 = m.rows[2];
  assert.deepEqual(row01.cells.map((c) => c.present), [false, true], 'key 01: a absent, b present');
  assert.deepEqual(row01.cells.map((c) => c.word), [ui.cbAbsent, ui.cbPresent], 'words');
  assert.deepEqual(row01.cells.map((c) => c.mark), [ui.cbAbsentMark, ui.cbPresentMark], 'marks');
  for (const row of m.rows) {
    for (const cell of row.cells) {
      assert.deepEqual(cell.cls, cell.present ? 'cb-yes' : 'cb-no', 'cls follows present');
    }
  }
});

test('badge: on exactly the all-present row, nowhere when no day has every label', () => {
  const ab = buildTableModel(AB, ['A', 'B']);
  assert.deepEqual(ab.rows.map((r) => r.badge), [null, ui.cbBadge, null, null], 'badge on key 11 only');
  const abc = buildTableModel(ABC, ['A', 'B', 'C']);
  assert.deepEqual(abc.rows.map((r) => r.badge), [null, null, null, null, null, ui.cbBadge], 'badge on key 111');
  const never = buildTableModel(NEVER, ['A', 'B']);
  assert.deepEqual(never.rows.map((r) => r.badge), [null, null], 'no all-present row, no badge');
});

test('one label: the row with key 1 carries the badge', () => {
  const m = buildTableModel(A, ['A']);
  assert.deepEqual(m.rows.map((r) => r.badge), [null, ui.cbBadge], 'key 1 is all present');
  assert.deepEqual(m.rows.map((r) => r.days), ['3', '3'], 'days');
});

test('sum of the days values equals n', () => {
  for (const [d, texts] of [[AB, ['A', 'B']], [ABC, ['A', 'B', 'C']], [A, ['A']], [PROTO, ['P', 'C']]]) {
    const sum = buildTableModel(d, texts).rows.reduce((s, r) => s + Number(r.days), 0);
    assert.deepEqual(sum, d.patterns.reduce((s, p) => s + p.count, 0), `sum for n ${d.n}`);
    assert.ok(sum === d.n, `sum equals n ${d.n}`);
  }
});

test('prototype names: keys __proto__ and constructor are read as plain data', () => {
  const m = buildTableModel(PROTO, ['P', 'C']);
  assert.deepEqual(m.headers, ['P', 'C', ui.cbDays, ui.cbShare], 'headers');
  assert.deepEqual(m.rows.map((r) => r.badge), [null, null, null, ui.cbBadge], 'badge on key 11');
  assert.deepEqual(m.rows[1].cells.map((c) => c.present), [false, true], 'key 01');
});

test('empty table: no rows, the summary still reads', () => {
  const m = buildTableModel(EMPTY, ['A']);
  assert.deepEqual(m.rows, [], 'no rows');
  assert.ok(typeof m.summary === 'string' && m.summary.length > 0, 'summary string');
});
