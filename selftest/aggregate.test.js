import { test, assert } from '../core/harness.js';
import { aggregate } from '../core/aggregate.js';

test('boundary splits same-day entries across dates', () => {
  const entries = [
    { date: '2026-10-12', minutes: 239, moods: [], labels: [0] },
    { date: '2026-10-12', minutes: 240, moods: [], labels: [1] },
  ];
  const { days, entries: out } = aggregate(entries, 240);
  assert.equal(days.length, 2, 'two calendar days');
  assert.equal(days[0].date, '2026-10-11', 'early entry rolls to previous day');
  assert.deepEqual(days[0].labels, [0], 'first day labels');
  assert.equal(days[0].entryCount, 1, 'first day count');
  assert.equal(days[1].date, '2026-10-12', 'late entry stays on its day');
  assert.deepEqual(days[1].labels, [1], 'second day labels');
  assert.equal(days[1].entryCount, 1, 'second day count');
  assert.equal(out[0].day, 0, 'first entry day index');
  assert.equal(out[1].day, 1, 'second entry day index');
});

test('contiguous range with an empty middle day', () => {
  const entries = [
    { date: '2026-10-01', minutes: 600, moods: [2], labels: [0] },
    { date: '2026-10-04', minutes: 600, moods: [3], labels: [0] },
  ];
  const { days } = aggregate(entries, 240);
  assert.equal(days.length, 4, 'four calendar days');
  assert.deepEqual(
    days.map((d) => d.date),
    ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'],
    'dates are contiguous',
  );
  assert.equal(days[1].entryCount, 0, 'middle day empty');
  assert.deepEqual(days[1].labels, [], 'middle day no labels');
  assert.deepEqual(days[1].moods, [], 'middle day no moods');
});

test('weekday is derived, not read from input', () => {
  const { days } = aggregate([{ date: '2026-10-12', minutes: 600, moods: [], labels: [] }], 240);
  assert.equal(days[0].weekday, 1, '2026-10-12 is a Monday');
});

test('month and year change at the boundary', () => {
  const entries = [
    { date: '2026-01-01', minutes: 100, moods: [], labels: [2] },
    { date: '2026-01-01', minutes: 600, moods: [], labels: [3] },
  ];
  const { days } = aggregate(entries, 240);
  assert.equal(days.length, 2, 'two calendar days');
  assert.deepEqual(
    days.map((d) => d.date),
    ['2025-12-31', '2026-01-01'],
    'early entry rolls into previous year',
  );
  assert.deepEqual(days[0].labels, [2], 'first day labels');
  assert.deepEqual(days[1].labels, [3], 'second day labels');
});

test('one entry only', () => {
  const { days, entries: out } = aggregate(
    [{ date: '2026-10-12', minutes: 600, moods: [4], labels: [5] }],
    240,
  );
  assert.equal(days.length, 1, 'one calendar day');
  assert.equal(days[0].entryCount, 1, 'single entry counted');
  assert.deepEqual(days[0].moods, [4], 'single mood kept');
  assert.equal(out[0].day, 0, 'single entry day index');
});

test('sort order with null minutes last', () => {
  const entries = [
    { date: '2026-10-12', minutes: null, moods: [], labels: [9] },
    { date: '2026-10-12', minutes: 300, moods: [], labels: [8] },
    { date: '2026-10-12', minutes: 250, moods: [], labels: [7] },
  ];
  const { entries: out } = aggregate(entries, 240);
  assert.deepEqual(
    out.map((e) => e.labels),
    [[7], [8], [9]],
    'minutes 250, 300, then null',
  );
  assert.equal(out[0].day, 0, 'null minutes stays on its calendar day');
});

test('empty input', () => {
  assert.deepEqual(aggregate([], 240), { days: [], entries: [] }, 'no days, no entries');
});

test('labels are sorted and unique within a day', () => {
  const { days } = aggregate(
    [
      { date: '2026-10-12', minutes: 600, moods: [], labels: [3, 1] },
      { date: '2026-10-12', minutes: 700, moods: [], labels: [1, 2] },
    ],
    240,
  );
  assert.deepEqual(days[0].labels, [1, 2, 3], 'labels sorted ascending and deduped');
  assert.equal(days[0].entryCount, 2, 'both entries counted');
});

test('input is not mutated', () => {
  const input = [{ date: '2026-10-12', minutes: 600, moods: [4], labels: [5] }];
  const copy = JSON.parse(JSON.stringify(input));
  aggregate(input, 240);
  assert.deepEqual(input, copy, 'input array and nested fields unchanged');
});
