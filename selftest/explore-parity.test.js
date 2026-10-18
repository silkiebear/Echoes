// Parity gate for the Explore views on real-shaped data (phase 4c, 4c.2 and 4c.3; Node). The default synthetic dataset
// goes through exportText, parseExport and toViewData. For the first five labels (by id) the days a label is present on,
// the T1, T2, T3, P1, P2, P3 and P4 counts must agree with the original synthetic data. Labels are matched by text,
// because the parser numbers labels in order of first appearance. Expected values are the original data; they are never
// edited to pass. Each shape is used as the views use it: calendar days for T1 and T2, observed days for T3, P3 and P4,
// timed entries for P1 and P2.
// Privacy (Node): a rendered card with a registered label leaves no label text in diagnostics without data.
import { test, assert } from '../core/harness.js';
import { generate } from '../core/synth.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { toViewData } from '../core/view-data.js';
import { buildYearData, buildStripData, buildLanesData, lastYear } from '../core/time-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { defaultSettings } from '../core/settings.js';
import { synth as synthConfig } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { explore } from '../config/explore.js';
import { viewSettings } from '../config/views.js';
import { views } from '../views/index.js';
import * as diag from '../core/diag.js';

const PARITY_LABELS = 5;
const T = viewSettings.time;

function idOfText(list, text) {
  const hit = list.labels.find((l) => l.text === text);
  if (!hit) throw new Error('parity: a label text is missing after the round trip');
  return hit.id;
}

function presentDates(data, id) {
  return data.days.filter((d) => d.labels.includes(id)).map((d) => d.date);
}

// Days with the label per weekday or month: rate x n is the count, exact up to rounding.
function countsOf(profile) {
  return profile.rows.map((r) => Math.round(r.rate * r.n));
}

const original = generate(synthConfig);
const parsed = parseExport(exportText(synthConfig, {}), parser).data;
const roundTrip = toViewData(parsed, defaultSettings(), explore);
const picks = original.labels.slice(0, PARITY_LABELS);
const rtObserved = { labels: roundTrip.labels, days: roundTrip.observedDays };
const rtTimed = { labels: roundTrip.labels, entries: roundTrip.entries };
const origTimed = { labels: original.labels, entries: original.entries.filter((e) => e.minutes !== null) };

test('parity: the days each of the first five labels is present on agree after the round trip', () => {
  for (const label of picks) {
    const rtId = idOfText(roundTrip, label.text);
    const before = presentDates(original, label.id);
    const after = presentDates(roundTrip, rtId);
    assert.ok(before.length > 0, `${label.text}: no days in the original`);
    assert.deepEqual(after, before, `${label.text}: presence days differ`);
  }
});

test('parity: T1 filled-cell count per label agrees for the last year', () => {
  const year = lastYear(original);
  for (const label of picks) {
    const rtId = idOfText(roundTrip, label.text);
    const a = buildYearData(original, year, label.id).days.filter((d) => d.present === 1).length;
    const b = buildYearData(roundTrip, year, rtId).days.filter((d) => d.present === 1).length;
    assert.equal(b, a, `${label.text}: T1 filled cells`);
  }
});

test('parity: T2 presence rows of the selection agree (calendar days)', () => {
  const ids = picks.map((l) => l.id);
  const rtIds = picks.map((l) => idOfText(roundTrip, l.text));
  const a = buildLanesData(original, ids).rows.map((r) => r.present);
  const b = buildLanesData(roundTrip, rtIds).rows.map((r) => r.present);
  assert.deepEqual(b, a, 'T2 presence rows');
});

test('parity: T3 monthly counts agree for the selection (observed days)', () => {
  const ids = picks.map((l) => l.id);
  const rtIds = picks.map((l) => idOfText(roundTrip, l.text));
  const a = buildStripData(original, ids, T.strip.bins).bins.map((b) => b.counts);
  const b = buildStripData(rtObserved, rtIds, T.strip.bins).bins.map((bin) => bin.counts);
  assert.deepEqual(b, a, 'T3 counts');
});

test('parity: P1 hour-grid totals and P2 dial bins agree per label (timed entries)', () => {
  assert.equal(buildHourGrid(rtTimed, null, 'count', T.weekStart).total, buildHourGrid(origTimed, null, 'count', T.weekStart).total, 'P1 total, all labels');
  for (const label of picks) {
    const rtId = idOfText(roundTrip, label.text);
    const a = buildDial(origTimed, [label.id], explore.periodic.dialBins).series[0].bins;
    const b = buildDial(rtTimed, [rtId], explore.periodic.dialBins).series[0].bins;
    assert.deepEqual(b, a, `${label.text}: P2 bins`);
  }
});

test('parity: P3 weekday counts agree per label (observed days)', () => {
  for (const label of picks) {
    const rtId = idOfText(roundTrip, label.text);
    const a = countsOf(buildWeekdayProfile(original, label.id, T.weekStart));
    const b = countsOf(buildWeekdayProfile(rtObserved, rtId, T.weekStart));
    assert.deepEqual(b, a, `${label.text}: P3 counts`);
  }
});

test('P3 and P4 counts add up to the days the label is present on (round trip)', () => {
  for (const label of picks) {
    const rtId = idOfText(roundTrip, label.text);
    const present = presentDates(roundTrip, rtId).length;
    const weekdays = countsOf(buildWeekdayProfile(rtObserved, rtId, T.weekStart)).reduce((s, n) => s + n, 0);
    const months = countsOf(buildMonthProfile(rtObserved, rtId)).reduce((s, n) => s + n, 0);
    assert.equal(weekdays, present, `${label.text}: P3 sum`);
    assert.equal(months, present, `${label.text}: P4 sum`);
  }
});

test('privacy: a card drawn with a registered label leaves no label text in diagnostics without data', () => {
  const SECRET = 'ZZPRIVATEWORD explore';
  const snapshot = diag.snapshot();
  try {
    const data = {
      labels: [{ id: 0, text: SECRET }],
      days: [{ date: '2024-01-01', labels: [0], mood: 3 }, { date: '2024-01-02', labels: [], mood: null }],
    };
    diag.register(SECRET, 'label');
    const lanes = buildLanesData(data, [0]);
    const t2 = views.find((v) => v.id === 'T2');
    const svg = t2.render(lanes, { range: T.lanes.defaultRange, width: viewSettings.defaultWidth });
    assert.ok(svg.includes('<svg'), 'the view drew nothing');
    assert.ok(!diag.build({ includeData: false }).includes('ZZPRIVATEWORD'), 'diagnostics carry the label text');
  } finally {
    diag.restore(snapshot);
  }
});
