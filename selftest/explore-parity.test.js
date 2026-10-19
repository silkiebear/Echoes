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
import { runScan } from '../core/stats/run.js';
import { prepare } from '../core/stats/prepare.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import { exploreEcho } from '../config/explore-echo.js';
import { buildE1Real, buildE2Real, buildE4Real } from '../core/echo-real.js';
import { fill } from '../core/explore-kit.js';
import { outcomesOf } from '../modules/explore-echo.js';
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

// E cards on the default export with the default choices (4f.2). Each entry is "length hash" (FNV-1a 32-bit of the markup).
// BEFORE: recorded from the 4e builders and views before the change. AFTER: the same inputs with the 4f.2 outcome lists
// (E1 and E4: the other selected label only). E2 is unchanged by design, so it must match BEFORE.
const PARITY_BEFORE_4E = {
  'E1@320': '9838 52176e0a', 'E2@320': '4142 fe47cd3b', 'E4@320': '3924 b8b41382',
  'E1@900': '9838 52176e0a', 'E2@900': '3952 8978df21', 'E4@900': '3792 40232669',
};
const PARITY_AFTER_4F2 = {
  'E1@320': '4087 79d4ba54', 'E2@320': '4142 fe47cd3b', 'E4@320': '768 0520125b',
  'E1@900': '4087 79d4ba54', 'E2@900': '3952 8978df21', 'E4@900': '665 9baae041',
};

function fnvOf(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

test('parity: E2 with the default choices is byte-identical to 4e; E1 and E4 match the 4f.2 outcome rule', async () => {
  const parsed = parseExport(exportText(synthConfig, {}), parser).data;
  const settings = defaultSettings();
  const scan = await runScan({ data: parsed, settings }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });
  const event = parsed.labels.find((l) => l.text === 'Late coffee F-').id;
  const outcome = parsed.labels.find((l) => l.text === 'Poor sleep S-').id;
  const prepared = prepare({ data: parsed, settings });
  const viewData = toViewData(parsed, settings, explore);
  const days = viewSettings.eventStudy.defaultWindow;
  const outcomes = outcomesOf([event, outcome], event);
  const byId = (id) => views.find((v) => v.id === id);
  const got = {};
  for (const width of [320, 900]) {
    got[`E1@${width}`] = (() => { const svg = byId('E1').render(buildE1Real(scan, parsed.labels, windows, event, outcomes), { width }); return `${svg.length} ${fnvOf(svg)}`; })();
    const e2Data = buildE2Real(prepared, event, outcome, {
      days: viewSettings.curve.days,
      shuffles: stats.placebo.shuffles.fast,
      seed: stats.placebo.seed,
      labels: parsed.labels,
      statsCfg: stats,
    });
    const e2Svg = byId('E2').render(e2Data, { width, caption: fill(exploreEcho.ui.e2.caption, { shuffles: stats.placebo.shuffles.fast }), desc: exploreEcho.ui.e2.desc });
    got[`E2@${width}`] = `${e2Svg.length} ${fnvOf(e2Svg)}`;
    const e4Svg = byId('E4').render(buildE4Real(viewData, event, days, outcomes), { width });
    got[`E4@${width}`] = `${e4Svg.length} ${fnvOf(e4Svg)}`;
  }
  for (const width of [320, 900]) {
    assert.equal(got[`E2@${width}`], PARITY_BEFORE_4E[`E2@${width}`], `E2 at ${width} px is byte-identical to 4e`);
  }
  for (const key of Object.keys(PARITY_AFTER_4F2)) assert.equal(got[key], PARITY_AFTER_4F2[key], `${key} matches the 4f.2 outcome rule`);
  assert.ok(got['E1@320'] !== PARITY_BEFORE_4E['E1@320'], 'E1 changed by the outcome rule (listed in the phase report)');
  assert.ok(got['E4@320'] !== PARITY_BEFORE_4E['E4@320'], 'E4 changed by the outcome rule (listed in the phase report)');
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
