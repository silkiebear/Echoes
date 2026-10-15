import { test, assert } from '../core/harness.js';

import { buildQuality } from '../core/quality.js';
import { timeDiversity as diversityFlags } from '../config/flags.js';

// Hand-built data. Ten labels; day 0, 1 and 4 carry all ten, day 2 carries one, day 3 is empty.
// Days with entries: 0 (10 marks), 1 (10), 2 (1), 4 (10). Median marks = 10, threshold 0.25 x 10 = 2.5.
// Timed entries: minutes 600, 600, 600, 300 (4 entries; the untimed one is excluded).
const TEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LABELS = ['Tracker A+', 'Coffee F-', 'Walk A+', 'Calm M+', 'Work W+', 'Sleep S+', 'Food F+', 'Water B+', 'Sport A+', 'Music M+']
  .map((text, id) => ({ id, text }));
const DAYS = [
  { day: 0, date: '2025-12-30', weekday: 2, labels: TEN, entryCount: 2, moods: [] },
  { day: 1, date: '2025-12-31', weekday: 3, labels: TEN, entryCount: 1, moods: [] },
  { day: 2, date: '2026-01-01', weekday: 4, labels: [0], entryCount: 1, moods: [] },
  { day: 3, date: '2026-01-02', weekday: 5, labels: [], entryCount: 0, moods: [] },
  { day: 4, date: '2026-01-03', weekday: 6, labels: TEN, entryCount: 1, moods: [] },
];
const ENTRIES = [
  { date: '2025-12-30', minutes: 600, day: 0, labels: [0, 1], moods: [] },
  { date: '2025-12-30', minutes: null, day: 0, labels: [2], moods: [] },
  { date: '2025-12-31', minutes: 600, day: 1, labels: [3], moods: [] },
  { date: '2026-01-01', minutes: 600, day: 2, labels: [0], moods: [] },
  { date: '2026-01-03', minutes: 300, day: 4, labels: [4], moods: [] },
];
const DATA = { labels: LABELS, days: DAYS, entries: ENTRIES };
const CFG = { completeness: { minMarksFraction: 0.25 }, diversity: diversityFlags };

function settingsWith(trackerLabel) {
  return { observation: { trackerLabel } };
}

test('range, spans and entry counts', () => {
  const q = buildQuality(DATA, settingsWith(''), CFG);
  assert.deepEqual(q.range, { from: '2025-12-30', to: '2026-01-03' }, 'range from first to last day');
  assert.equal(q.spanDays, 5, 'five days from 30 Dec to 3 Jan');
  assert.equal(q.daysWithEntries, 4, 'the empty 2 Jan is not counted');
  assert.equal(q.entries, 5, 'five entries');
  assert.equal(q.entriesNoTime, 1, 'one entry without a time');
});

test('tracker days: counted, null when not set, zero when the label is not in the data', () => {
  assert.equal(buildQuality(DATA, settingsWith('Tracker A+'), CFG).trackerDays, 4, 'days 0, 1, 2 and 4 hold label 0');
  assert.equal(buildQuality(DATA, settingsWith(''), CFG).trackerDays, null, 'null when the label is not set');
  assert.equal(buildQuality(DATA, settingsWith('Missing one'), CFG).trackerDays, 0, 'zero when no label matches');
});

test('median marks over days with entries', () => {
  assert.equal(buildQuality(DATA, settingsWith(''), CFG).medianMarks, 10, 'median of 10, 10, 1, 10');
});

test('a day with one mark among days with ten is low-completeness; the empty day is not counted', () => {
  const q = buildQuality(DATA, settingsWith(''), CFG);
  assert.equal(q.lowCompletenessDays, 1, 'only day 2 (1 mark) is below 2.5');
  assert.equal(q.lowCompletenessShare, 0.25, '1 of 4 days with entries');
});

test('by year: two years, days and entries split by assigned date', () => {
  const q = buildQuality(DATA, settingsWith(''), CFG);
  assert.deepEqual(q.byYear, [
    { year: '2025', days: 2, daysWithEntries: 2, entries: 3 },
    { year: '2026', days: 3, daysWithEntries: 2, entries: 2 },
  ], 'by-year rows');
});

test('time-of-day diversity uses timed entries only', () => {
  const d = buildQuality(DATA, settingsWith(''), CFG).timeDiversity;
  assert.equal(d.n, 4, 'four timed entries');
  assert.equal(d.topShare, 0.75, 'three of four at minute 600');
  assert.equal(d.distinctHours, 2, 'hours 10 and 5');
  assert.equal(d.low, true, 'two distinct hours is below the minimum of four');
});

test('empty data gives empty coverage', () => {
  const q = buildQuality({ labels: [], days: [], entries: [] }, settingsWith(''), CFG);
  assert.equal(q.range, null, 'no range');
  assert.equal(q.spanDays, 0, 'no span');
  assert.equal(q.medianMarks, 0, 'median is zero');
  assert.equal(q.lowCompletenessShare, 0, 'no share');
  assert.deepEqual(q.byYear, [], 'no years');
  assert.equal(q.timeDiversity.n, 0, 'no timed entries');
});
