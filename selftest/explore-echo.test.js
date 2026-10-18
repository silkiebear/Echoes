// E views on real data: adapters (phase 4d, 4d.4; pure, Node and browser). Round trip: export text, parse, then the Echo
// scan. Methods, written before the first run: E2 lag rate = exposed days t (observed) with t + lag inside the data and
// observed, hits = the outcome on day t + lag, over the same count. E4 as in core/event-study-demo.js, on the observed
// days: an event is an observed day with the exposure and none in the previous gapDays observed days; before and after are
// outcome shares over the windows of observed days; the values are means over the events.
import { test, assert } from '../core/harness.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { parser } from '../config/parser.js';
import { synth } from '../config/synth.js';
import { defaultSettings } from '../core/settings.js';
import { prepare } from '../core/stats/prepare.js';
import { runScan } from '../core/stats/run.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { explore } from '../config/explore.js';
import { toViewData } from '../core/view-data.js';
import { buildE1Real, buildE2Real, buildE4Real } from '../core/echo-real.js';
import * as diag from '../core/diag.js';
import e1View from '../views/e1-echo-matrix.js';

const LAGS = [1, 2, 3];
// Few shuffles keep the Node test fast; the band itself is not compared with counts.
const TEST_SHUFFLES = 20;
const EVENT_TEXT = 'Late coffee F-';
const OUTCOME_TEXT = 'Poor sleep S-';

const data = parseExport(exportText(synth, {}), parser).data;
const idOf = (text) => data.labels.find((l) => l.text === text).id;
const scanOf = (d) => runScan({ data: d, settings: defaultSettings() }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });

test('E1 real: each cell is the adjusted rate ratio of the scan row for the pair; a cell with no row is null', async () => {
  const scan = await scanOf(data);
  const event = idOf(EVENT_TEXT);
  const outcomes = [...new Set(scan.rows.filter((r) => r.exposure === event).map((r) => r.outcome))];
  assert.ok(outcomes.length > 0, 'the scan has rows for the event');
  const e1 = buildE1Real(scan, data.labels, windows, event, outcomes);
  let filled = 0;
  outcomes.forEach((o, i) => windows.forEach((w, j) => {
    const row = scan.rows.find((r) => r.exposure === event && r.outcome === o && r.window === w.id);
    const expected = row && Number.isFinite(row.rrAdj) ? row.rrAdj : null;
    assert.equal(e1.cells[i][j].rr, expected, `outcome ${o} window ${w.id}`);
    if (expected !== null) filled += 1;
  }));
  assert.ok(filled > 0, 'some cells have a ratio');
  assert.ok(e1.cells.some((row) => row.some((c) => c.rr === null)), 'some cells are null');
});

test('E2 real: the lag rates equal a direct count from the raw days for lags 1 to 3', () => {
  const prepared = prepare({ data, settings: defaultSettings() });
  const event = idOf(EVENT_TEXT);
  const outcome = idOf(OUTCOME_TEXT);
  const e2 = buildE2Real(prepared, event, outcome, {
    days: 3, shuffles: TEST_SHUFFLES, seed: stats.placebo.seed, labels: data.labels, statsCfg: stats,
  });
  const observed = data.days.map((d) => d.entryCount > 0);
  for (const lag of LAGS) {
    let n = 0;
    let hits = 0;
    for (let t = 0; t + lag < data.days.length; t += 1) {
      if (!observed[t] || !observed[t + lag]) continue;
      if (!data.days[t].labels.includes(event)) continue;
      n += 1;
      if (data.days[t + lag].labels.includes(outcome)) hits += 1;
    }
    const point = e2.points[lag - 1];
    assert.equal(point.day, lag, `lag ${lag} day`);
    assert.equal(point.n, n, `lag ${lag} count`);
    assert.equal(point.rate, n > 0 ? hits / n : null, `lag ${lag} rate`);
  }
});

test('E4 real: the events and the before and after shares equal a direct count on the observed days', () => {
  const view = toViewData(data, defaultSettings(), explore);
  const event = idOf('Alcohol H-');
  const days = viewSettings.eventStudy.defaultWindow;
  const e4 = buildE4Real(view, event, days);
  const obs = view.observedDays;
  const gap = viewSettings.eventStudy.gapDays;
  const has = (t, id) => obs[t].labels.includes(id);
  const events = [];
  for (let t = 0; t < obs.length; t += 1) {
    if (!has(t, event)) continue;
    let isEvent = true;
    for (let k = 1; k <= gap; k += 1) {
      if (t - k >= 0 && has(t - k, event)) {
        isEvent = false;
        break;
      }
    }
    if (isEvent && t - days >= 0 && t + days <= obs.length - 1) events.push(t);
  }
  assert.equal(e4.nEvents, events.length, 'events');
  assert.ok(e4.rows.length > 0, 'rows');
  const row = e4.rows[0];
  const outcome = data.labels.find((l) => l.text === row.outcomeLabel).id;
  let before = 0;
  let after = 0;
  for (const t of events) {
    let b = 0;
    let a = 0;
    for (let t2 = t - days; t2 <= t - 1; t2 += 1) if (has(t2, outcome)) b += 1;
    for (let t2 = t + 1; t2 <= t + days; t2 += 1) if (has(t2, outcome)) a += 1;
    before += b / days;
    after += a / days;
  }
  assert.equal(row.before, before / events.length, 'before');
  assert.equal(row.after, after / events.length, 'after');
});

test('E views real: labels named __proto__ and constructor change no object', () => {
  const labels = [{ id: 0, text: '__proto__' }, { id: 1, text: 'constructor' }, { id: 2, text: 'Other' }];
  const scan = {
    rows: [{ exposure: 0, outcome: 1, window: '1d', n: 3, rrAdj: 1.5, diff: 0.1, flags: { lowSample: true }, longRuns: false }],
    meta: {}, data: null, settings: null,
  };
  const before = JSON.stringify(Object.keys(Object.prototype));
  const e1 = buildE1Real(scan, labels, windows, 0, [1, 2]);
  assert.equal(e1.outcomes[0].label, 'constructor', 'label text kept');
  assert.equal(Object.getPrototypeOf(e1.outcomes[0]), Object.prototype, 'outcome prototype');
  assert.equal(e1.cells[0][0].rr, 1.5, 'cell ratio');
  assert.deepEqual(e1.cells[0][0].flags, ['lowSample'], 'flags');
  assert.equal(JSON.stringify(Object.keys(Object.prototype)), before, 'Object.prototype unchanged');
});

test('E views real: after a label is drawn, the diagnostics without data sections contain no label text', () => {
  const probe = 'Probe label text for the E views';
  const labels = [{ id: 0, text: probe }, { id: 1, text: 'Other' }];
  const scan = {
    rows: [{ exposure: 0, outcome: 1, window: '1d', n: 3, rrAdj: 1.5, diff: 0.1, flags: {}, longRuns: false }],
    meta: {}, data: null, settings: null,
  };
  const snapshot = diag.snapshot();
  try {
    diag.register(probe, 'label');
    const svg = e1View.render(buildE1Real(scan, labels, windows, 0, [1]), {});
    assert.ok(svg.includes('<svg'), 'drew');
    const text = diag.build({ includeData: false });
    assert.ok(!text.includes(probe), 'label text in the diagnostics');
  } finally {
    diag.restore(snapshot);
  }
});
