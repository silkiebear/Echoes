// Adapter from parsed data to the builder shape (phase 4c, 4c.2; pure, Node and browser). Hand cases for the weekday
// (from the assigned date), the day mood (mean of the entries' scores, rounded to the nearest whole score with halves
// up), days without a usable mood, and the error for a missing argument.
import { test, assert } from '../core/harness.js';
import { toViewData } from '../core/view-data.js';
import { weekdayOf } from '../core/calendar.js';
import { explore } from '../config/explore.js';

// Three moods: A is best (score 3), B 2, C 1 (score = count - order + 1).
const SETTINGS = { moods: [{ name: 'A', order: 1 }, { name: 'B', order: 2 }, { name: 'C', order: 3 }] };

// Entries get the date of their day, no labels and no time unless the case sets them (parsed entries always have both).
function dataWith(days, entries) {
  return {
    labels: [{ id: 0, text: 'L0' }],
    moodNames: ['A', 'B', 'C', 'Zed'],
    days: days.map((date, day) => ({ day, date, labels: [0], entryCount: 0, moods: [] })),
    entries: entries.map((e) => ({ date: days[e.day], minutes: null, labels: [], ...e })),
  };
}

test('toViewData: weekday comes from the assigned date; labels keep their ids and texts', () => {
  const data = dataWith(['2024-01-01', '2024-01-07'], []);
  const view = toViewData(data, SETTINGS, explore);
  assert.equal(view.days[0].weekday, 1, 'Monday is 1 (getDay convention)');
  assert.equal(view.days[1].weekday, 0, 'Sunday is 0');
  assert.equal(view.days[0].weekday, weekdayOf('2024-01-01'), 'same as calendar.weekdayOf');
  assert.deepEqual(view.labels, [{ id: 0, text: 'L0' }], 'labels');
  assert.deepEqual(view.days[0].labels, [0], 'day labels');
});

test('toViewData: day mood is the rounded mean of the entries; halves round up; unscored days are null', () => {
  const days = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06'];
  const entries = [
    { day: 0, moods: [0] }, { day: 0, moods: [1] }, // A 3 and B 2: mean 2.5 rounds to 3
    { day: 1, moods: [0] }, { day: 1, moods: [2] }, // A 3 and C 1: mean 2
    { day: 2, moods: [1] }, { day: 2, moods: [2] }, // B 2 and C 1: mean 1.5 rounds to 2
    { day: 3, moods: [3] }, // Zed is not a mood in settings: no score
    { day: 5, moods: [] }, // an entry without a mood
  ];
  const view = toViewData(dataWith(days, entries), SETTINGS, explore);
  assert.deepEqual(view.days.map((d) => d.mood), [3, 2, 2, null, null, null], 'day moods');
});

test('toViewData: a day with no entries has a null mood and keeps its date', () => {
  const view = toViewData(dataWith(['2024-02-10'], []), SETTINGS, explore);
  assert.equal(view.days[0].mood, null, 'mood');
  assert.equal(view.days[0].date, '2024-02-10', 'date');
});

test('toViewData: a missing argument is refused and the error names it, not any label text', () => {
  assert.throws(() => toViewData(null, SETTINGS, explore), 'argument data', 'missing data');
  assert.throws(() => toViewData(dataWith(['2024-01-01'], []), { moods: null }, explore), 'argument settings', 'missing moods');
  assert.throws(() => toViewData(dataWith(['2024-01-01'], []), SETTINGS, {}), 'argument cfg.dayMood', 'missing rounding');
});

test('toViewData: observed days are the days with an entry; gap days stay in the calendar list only', () => {
  const days = ['2024-01-01', '2024-01-02', '2024-01-03'];
  const data = dataWith(days, [{ day: 0, date: '2024-01-01', minutes: 600, labels: [0], moods: [] }]);
  data.days[2].entryCount = 0;
  data.days[0].entryCount = 1;
  data.days[1].entryCount = 0;
  const view = toViewData(data, SETTINGS, explore);
  assert.equal(view.days.length, 3, 'calendar days');
  assert.deepEqual(view.observedDays.map((d) => d.date), ['2024-01-01'], 'observed days');
});

test('toViewData: entries without a time are left out of the time views and counted', () => {
  const data = dataWith(['2024-01-01'], [
    { day: 0, date: '2024-01-01', minutes: 615, labels: [0], moods: [] },
    { day: 0, date: '2024-01-01', minutes: null, labels: [0], moods: [] },
  ]);
  const view = toViewData(data, SETTINGS, explore);
  assert.deepEqual(view.entries, [{ date: '2024-01-01', minutes: 615, labels: [0] }], 'timed entries');
  assert.equal(view.untimedCount, 1, 'untimed count');
});
