import { test, assert } from '../core/harness.js';

import { addDays, weekdayOf, columnOf, weekStartOf, dayOf, weekdayLabels } from '../core/calendar.js';

test('weekday, column and week start', () => {
  assert.equal(weekdayOf('2026-10-12'), 1, 'weekday of 2026-10-12 is 1');
  assert.equal(columnOf('2026-10-12', 1), 0, 'column of 2026-10-12 with start 1 is 0');
  assert.equal(columnOf('2026-10-18', 1), 6, 'column of 2026-10-18 with start 1 is 6');
  assert.equal(columnOf('2026-10-18', 0), 0, 'column of 2026-10-18 with start 0 is 0');
  assert.equal(weekStartOf('2026-10-12', 1), '2026-10-12', 'week start of 2026-10-12 is itself');
  assert.equal(weekStartOf('2026-10-14', 1), '2026-10-12', 'week start of 2026-10-14 is 2026-10-12');
  assert.equal(weekStartOf('2026-10-18', 1), '2026-10-12', 'week start of 2026-10-18 is 2026-10-12');
  assert.equal(weekStartOf('2026-01-01', 1), '2025-12-29', 'week start of 2026-01-01 is 2025-12-29');
});

test('leap years and year boundaries', () => {
  assert.equal(weekdayOf('2024-02-29'), 4, 'weekday of 2024-02-29 is 4');
  assert.equal(addDays('2024-02-28', 2), '2024-03-01', 'addDays 2024-02-28 +2 is 2024-03-01');
  assert.equal(addDays('2025-12-31', 1), '2026-01-01', 'addDays 2025-12-31 +1 is 2026-01-01');
});

test('day boundary at 240 minutes', () => {
  assert.equal(dayOf('2026-10-12', 120, 240), '2026-10-11', 'dayOf 120/240 is previous day');
  assert.equal(dayOf('2026-10-12', 239, 240), '2026-10-11', 'dayOf 239/240 is previous day');
  assert.equal(dayOf('2026-10-12', 240, 240), '2026-10-12', 'dayOf 240/240 is same day');
  assert.equal(dayOf('2026-01-01', 60, 240), '2025-12-31', 'dayOf 60/240 on Jan 1 is previous year');
  assert.equal(dayOf('2024-03-01', 0, 240), '2024-02-29', 'dayOf 0/240 on leap Mar 1 is Feb 29');
  assert.equal(dayOf('2026-03-01', 0, 240), '2026-02-28', 'dayOf 0/240 on non-leap Mar 1 is Feb 28');
});

test('dayOf without a usable time keeps the date', () => {
  assert.equal(dayOf('2026-10-12', null, 240), '2026-10-12', 'dayOf null/240 keeps the date');
  assert.equal(dayOf('2026-10-12', undefined, 240), '2026-10-12', 'dayOf undefined/240 keeps the date');
  assert.equal(dayOf('2026-10-12', NaN, 240), '2026-10-12', 'dayOf NaN/240 keeps the date');
});

test('dayOf boundary 0 never shifts and 240 keeps 240 and 241', () => {
  assert.equal(dayOf('2026-10-12', 0, 0), '2026-10-12', 'dayOf 0/0 keeps the date');
  assert.equal(dayOf('2026-10-12', 1439, 0), '2026-10-12', 'dayOf 1439/0 keeps the date');
  assert.equal(dayOf('2026-10-12', 241, 240), '2026-10-12', 'dayOf 241/240 keeps the date');
});

test('weekday labels', () => {
  assert.equal(weekdayLabels(1).length, 7, 'weekdayLabels(1) has length 7');
  assert.equal(weekdayLabels(0).length, 7, 'weekdayLabels(0) has length 7');
  assert.ok(weekdayLabels(1)[0] !== weekdayLabels(0)[0], 'first label differs between start 1 and start 0');
});

test('addDays across month end', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01', 'addDays 2026-01-31 +1 is 2026-02-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28', 'addDays 2026-03-01 -1 is 2026-02-28');
});
